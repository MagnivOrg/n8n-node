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
				description: 'The name of the workflow to execute.',
				routing: {
					request: {
						method: 'POST',
						url: '/workflows/{{$agentName}}/run'
					}
				}
			},
			{
				displayName: 'Workflow Version Number',
				name: 'workflowVersionNumber',
				type: 'string',
				default: '',
				placeholder: '1',
				description: 'Specify a workflow version number to run a specific version.',
			},
			{
				displayName: 'Input Variables',
				name: 'inputVariables',
				type: 'json',
				default: '{}',
				description: 'A dictionary of input variables required by the workflow.',
			},

			// Optionally fields will go here
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				default: {},
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Metadata',
						name: 'metadata',
						type: 'json',
						default: '{}',
						description: 'A JSON of metadata key-value pairs.',
					},
					{
						displayName: 'Return All Outputs',
						name: 'returnAllOutputs',
						type: 'boolean',
						default: false,
						description: 'If set to true, all outputs from the workflow execution will be returned.',
					},
					{
						displayName: 'Workflow Label Name',
						name: 'workflowLabelName',
						type: 'string',
						default: "",
						description: 'Specify a workflow label name to run a specific labeled version.',
					}
				]
			}	
		]
	};
}