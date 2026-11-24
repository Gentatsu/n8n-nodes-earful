// Live check of the trigger against the Earful API: EARFUL_API_KEY=ef_... node test/trigger.mjs (after npm run build)
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { EarfulTrigger, validSignature } from '../dist/nodes/EarfulTrigger/EarfulTrigger.node.js';

const key = process.env.EARFUL_API_KEY;
assert.ok(key, 'set EARFUL_API_KEY');
const staticData = {};
const params = { locationId: '', maxRating: 2 };

async function request(_cred, o) {
	const res = await fetch(o.url, {
		method: o.method ?? 'GET',
		headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
		body: o.body ? JSON.stringify(o.body) : undefined,
	});
	const body = res.status === 204 ? undefined : await res.json();
	if (o.returnFullResponse) return { statusCode: res.status, body };
	if (!res.ok) throw Object.assign(new Error(body?.detail), { httpCode: String(res.status) });
	return body;
}

const hooks = {
	getNode: () => ({ name: 'Earful Trigger' }),
	getWorkflowStaticData: () => staticData,
	getNodeParameter: (name) => params[name],
	getNodeWebhookUrl: () => 'https://example.com/n8n-earful-test',
	helpers: { httpRequestWithAuthentication: request },
};
const methods = new EarfulTrigger().webhookMethods.default;

assert.equal(await methods.checkExists.call(hooks), false);
assert.equal(await methods.create.call(hooks), true);
assert.match(staticData.secret, /^whsec_/);
const alert = await request(null, { url: `https://earful.onibaku.co.uk/api/v1/alerts/${staticData.alertId}` });
assert.equal(alert.maxRating, 2);
assert.equal(await methods.checkExists.call(hooks), true);

// A delivery signed the way Earful signs them becomes one item per review; a bad signature gets a 401
const body = JSON.stringify({ event: 'reviews.new', reviews: [{ id: 'rev_1' }, { id: 'rev_2' }] });
const t = Math.floor(Date.now() / 1000);
const sig = `t=${t},v1=${createHmac('sha256', staticData.secret).update(`${t}.${body}`).digest('hex')}`;
let status;
const delivery = (header) => ({
	getRequestObject: () => ({ rawBody: Buffer.from(body), headers: { 'earful-signature': header } }),
	getResponseObject: () => ({ status: (s) => ((status = s), { send() {} }) }),
	getWorkflowStaticData: () => staticData,
	getBodyData: () => JSON.parse(body),
	helpers: { returnJsonArray: (a) => a.map((json) => ({ json })) },
});
const trigger = new EarfulTrigger();
const ok = await trigger.webhook.call(delivery(sig));
assert.deepEqual(ok.workflowData[0].map((i) => i.json.id), ['rev_1', 'rev_2']);
assert.deepEqual(await trigger.webhook.call(delivery(`t=${t},v1=${'0'.repeat(64)}`)), { noWebhookResponse: true });
assert.equal(status, 401);
assert.equal(validSignature(staticData.secret, body, `t=${t - 600},v1=x`), false);

assert.equal(await methods.delete.call(hooks), true);
assert.equal(staticData.alertId, undefined);
console.log('trigger ok');
