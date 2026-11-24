import {
	NodeConnectionTypes,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { getLocations } from './getLocations';

export const siteOptions = [
	{ name: 'App Store', value: 'appstore' },
	{ name: 'Booking', value: 'booking' },
	{ name: 'Capterra', value: 'capterra' },
	{ name: 'Deliveroo', value: 'deliveroo' },
	{ name: 'DoorDash', value: 'doordash' },
	{ name: 'Facebook', value: 'facebook' },
	{ name: 'Feefo', value: 'feefo' },
	{ name: 'G2', value: 'g2' },
	{ name: 'Google', value: 'google' },
	{ name: 'Google Play', value: 'googleplay' },
	{ name: 'Grubhub', value: 'grubhub' },
	{ name: 'Just Eat', value: 'justeat' },
	{ name: 'OpenTable', value: 'opentable' },
	{ name: 'REVIEWS.io', value: 'reviewsio' },
	{ name: 'Tripadvisor', value: 'tripadvisor' },
	{ name: 'Trustpilot', value: 'trustpilot' },
	{ name: 'Uber Eats', value: 'ubereats' },
	{ name: 'Yelp', value: 'yelp' },
];

const forReviewSearch = { resource: ['review'], operation: ['getAll'] };
const forReviewReply = { resource: ['review'], operation: ['reply'] };
const forLocationSearch = { resource: ['location'], operation: ['getAll'] };

const qs = (name: string) => ({ request: { qs: { [name]: '={{$value || undefined}}' } } });

const reviewProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['review'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Search reviews, newest first',
				action: 'Get many reviews',
				routing: {
					request: { method: 'GET', url: '/reviews' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
			{
				name: 'Reply',
				value: 'reply',
				description:
					'Reply to a review. Earful posts it on the site where it can, otherwise marks it replied and returns the link to reply there.',
				action: 'Reply to a review',
				routing: {
					request: {
						method: 'POST',
						url: '=/reviews/{{encodeURIComponent($parameter.reviewId)}}/reply',
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: forReviewSearch },
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		routing: {
			send: { paginate: '={{ $value }}', type: 'query', property: 'limit', value: '100' },
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{ !!$response.body.nextCursor }}',
						request: { qs: { cursor: '={{ $response.body.nextCursor }}' } },
					},
				},
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { ...forReviewSearch, returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		description: 'Max number of results to return',
		routing: { send: { type: 'query', property: 'limit' }, output: { maxResults: '={{$value}}' } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: { show: forReviewSearch },
		default: {},
		options: [
			{
				displayName: 'First Seen Since',
				name: 'since',
				type: 'dateTime',
				default: '',
				description: 'Only reviews Earful first saw at or after this time',
				routing: qs('since'),
			},
			{
				displayName: 'Location Name or ID',
				name: 'location',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getLocations' },
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: qs('location'),
			},
			{
				displayName: 'Rating',
				name: 'rating',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 5 },
				default: 1,
				description: 'Exact star rating, from 1 to 5',
				routing: qs('rating'),
			},
			{
				displayName: 'Sentiment',
				name: 'sentiment',
				type: 'options',
				options: [
					{ name: 'Mixed', value: 'mixed' },
					{ name: 'Negative', value: 'negative' },
					{ name: 'Neutral', value: 'neutral' },
					{ name: 'Positive', value: 'positive' },
				],
				default: 'negative',
				routing: qs('sentiment'),
			},
			{
				displayName: 'Site',
				name: 'site',
				type: 'options',
				options: siteOptions,
				default: 'google',
				routing: qs('site'),
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Any', value: 'any' },
					{ name: 'Deleted', value: 'deleted' },
					{ name: 'Edited', value: 'edited' },
					{ name: 'Handled', value: 'handled' },
					{ name: 'Open', value: 'open' },
					{ name: 'Replied', value: 'replied' },
					{ name: 'Unreplied', value: 'unreplied' },
				],
				default: 'unreplied',
				routing: qs('status'),
			},
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'string',
				default: '',
				routing: qs('tag'),
			},
			{
				displayName: 'Text Contains',
				name: 'q',
				type: 'string',
				default: '',
				description: 'Only reviews whose text, title or reviewer contains this',
				routing: qs('q'),
			},
		],
	},
	{
		displayName: 'Review ID',
		name: 'reviewId',
		type: 'string',
		required: true,
		displayOptions: { show: forReviewReply },
		default: '',
		placeholder: 'e.g. rev_123',
		description: 'The Earful review ID, for example from the trigger or Get Many',
	},
	{
		displayName: 'Reply',
		name: 'text',
		type: 'string',
		required: true,
		typeOptions: { rows: 4 },
		displayOptions: { show: forReviewReply },
		default: '',
		description: 'The reply text, as it will appear on the site',
		routing: { send: { type: 'body', property: 'text' } },
	},
];

const locationProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['location'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List locations, or find one by your own reference',
				action: 'Get many locations',
				routing: {
					request: { method: 'GET', url: '/locations' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Your Reference',
		name: 'externalRef',
		type: 'string',
		displayOptions: { show: forLocationSearch },
		default: '',
		description: 'Only the location with this reference. Leave empty to list every location.',
		routing: qs('externalRef'),
	},
];

export class Earful implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Earful',
		name: 'earful',
		icon: { light: 'file:../../icons/earful.svg', dark: 'file:../../icons/earful.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Search reviews from Google, Tripadvisor, Trustpilot and more, and reply to them',
		defaults: { name: 'Earful' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'earfulApi', required: true }],
		requestDefaults: {
			baseURL: 'https://earful.onibaku.co.uk/api/v1',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Location', value: 'location' },
					{ name: 'Review', value: 'review' },
				],
				default: 'review',
			},
			...reviewProperties,
			...locationProperties,
		],
	};

	methods = { loadOptions: { getLocations } };
}
