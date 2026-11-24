import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export async function getLocations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'earfulApi', {
		url: 'https://earful.onibaku.co.uk/api/v1/locations',
		json: true,
	})) as { data: Array<{ id: string; name: string }> };
	return response.data.map((location) => ({ name: location.name, value: location.id }));
}
