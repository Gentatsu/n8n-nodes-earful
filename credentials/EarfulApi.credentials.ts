import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class EarfulApi implements ICredentialType {
	name = 'earfulApi';

	displayName = 'Earful API';

	icon: Icon = { light: 'file:../icons/earful.svg', dark: 'file:../icons/earful.svg' };

	documentationUrl = 'https://earful.onibaku.co.uk/api/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Create a key in Earful under Settings, API, New key. Choose write access to post replies or use the trigger.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://earful.onibaku.co.uk/api/v1',
			url: '/workspace',
		},
	};
}
