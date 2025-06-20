import { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class RunAgent implements INodeType {
	description: INodeTypeDescription = {
		// Basic node details will go here
		displayName: 'Run Agent',
		name: 'RunAgent',
		icon: 'file:promptLayer.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Run Prompt Layer Agent/Workflow',
		description: 'Run an Agent from the PromptLayer API',
		defaults: {
			name: 'Run Agent Default',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'RunAgentApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.promptlayer.com',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		
		// Required Fields
		properties: [
			{
				// User must provide the name of the agent to run. No API infrastructure exists to list agents.
				displayName: 'Agent/Workflow Name',
				name: 'agentName',
				type: 'string',
				default: '',
				required: true,
				description: 'The name of the agent or workflow to run. No API infrastructure exists to list agents or workflows at this time.',
				routing: {
					request: {
						method: 'POST',
						url: '/workflows/{{$agentName}}/run',
					}
				}
			},

			// Optionally fields will go here
		
		]
	};
}