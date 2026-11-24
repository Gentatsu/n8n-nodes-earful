import { createHmac, timingSafeEqual } from 'crypto';
import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type IHttpRequestMethods,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';
import { getLocations } from '../Earful/getLocations';

async function earfulRequest(
	this: IHookFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
) {
	try {
		return (await this.helpers.httpRequestWithAuthentication.call(this, 'earfulApi', {
			method,
			url: `https://earful.onibaku.co.uk/api/v1${path}`,
			body,
			json: true,
		})) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

// Earful-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of `${t}.${body}`>
export function validSignature(secret: string, body: string, header: string, now = Date.now()) {
	const parts = Object.fromEntries(header.split(',').map((part) => part.split('=')));
	const t = Number(parts.t);
	if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > 300) return false;
	const expected = Buffer.from(createHmac('sha256', secret).update(`${t}.${body}`).digest('hex'));
	const given = Buffer.from(String(parts.v1 ?? ''));
	return given.length === expected.length && timingSafeEqual(given, expected);
}

export class EarfulTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Earful Trigger',
		name: 'earfulTrigger',
		icon: { light: 'file:../../icons/earful.svg', dark: 'file:../../icons/earful.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: 'New reviews',
		description: 'Starts the workflow when Earful finds new reviews',
		defaults: { name: 'Earful Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'earfulApi', required: true }],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [
			{
				displayName:
					'Webhooks need the Plus plan and a write key. Each new review becomes one item.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Location Name or ID',
				name: 'locationId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getLocations' },
				default: '',
				description:
					'Only reviews for this location. Leave empty for every location. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Ratings Up To',
				name: 'maxRating',
				type: 'options',
				options: [
					{ name: 'Any Rating', value: 0 },
					{ name: '1 Star', value: 1 },
					{ name: '2 Stars', value: 2 },
					{ name: '3 Stars', value: 3 },
					{ name: '4 Stars', value: 4 },
				],
				default: 0,
				description: 'Only reviews at or below this rating, for example to catch negative ones',
			},
		],
	};

	methods = { loadOptions: { getLocations } };

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (!data.alertId) return false;
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'earfulApi', {
					url: `https://earful.onibaku.co.uk/api/v1/alerts/${data.alertId as string}`,
					json: true,
					ignoreHttpStatusErrors: true,
					returnFullResponse: true,
				});
				if (response.statusCode === 200) return true;
				if (response.statusCode !== 404) {
					throw new NodeApiError(this.getNode(), response.body as JsonObject, {
						httpCode: String(response.statusCode),
					});
				}
				delete data.alertId;
				delete data.secret;
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const body: IDataObject = {
					channel: 'webhook',
					target: this.getNodeWebhookUrl('default'),
				};
				const locationId = this.getNodeParameter('locationId') as string;
				const maxRating = this.getNodeParameter('maxRating') as number;
				if (locationId) body.locationId = locationId;
				if (maxRating) body.maxRating = maxRating;
				const alert = await earfulRequest.call(this, 'POST', '/alerts', body);
				const data = this.getWorkflowStaticData('node');
				data.alertId = alert.id;
				data.secret = alert.secret;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (data.alertId) {
					try {
						await earfulRequest.call(this, 'DELETE', `/alerts/${data.alertId as string}`);
					} catch (error) {
						if ((error as NodeApiError).httpCode !== '404') return false;
					}
				}
				delete data.alertId;
				delete data.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const secret = this.getWorkflowStaticData('node').secret as string | undefined;
		const raw = (req as unknown as { rawBody?: Buffer }).rawBody?.toString('utf8') ?? '';
		if (!secret || !validSignature(secret, raw, String(req.headers['earful-signature'] ?? ''))) {
			this.getResponseObject().status(401).send('Invalid signature');
			return { noWebhookResponse: true };
		}
		const body = this.getBodyData() as { event?: string; reviews?: IDataObject[] };
		if (body.event !== 'reviews.new' || !body.reviews?.length) return {};
		return { workflowData: [this.helpers.returnJsonArray(body.reviews)] };
	}
}
