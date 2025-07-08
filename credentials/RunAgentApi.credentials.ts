import { IAuthenticateGeneric, ICredentialType, INodeProperties, ICredentialTestRequest } from 'n8n-workflow';

export class RunAgentApi implements ICredentialType {
	name = 'runAgentApi';
	displayName = 'Run Agent API';
	icon = 'file:runAgent.svg' as const;
	// Uses the link to this tutorial as an example
	// Replace with your own docs links when building your own nodes
	documentationUrl =
		'https://github.com/MagnivOrg/n8n-node/blob/master/README.md';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-KEY': '={{$credentials.apiKey}}',
			},
		},
	};

	// Test endpoint so n8n can verify the credentials during installation/CI
	// It performs a simple authenticated GET request that returns the current user.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.promptlayer.com',
			method: 'GET',
			url: '/prompt-templates',
			headers: {
				'X-API-KEY': '={{$credentials.apiKey}}',
			},
		},
	};
}
