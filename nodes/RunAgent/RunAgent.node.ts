import {
	IExecuteFunctions,
    INodeExecutionData,
    INodeType, 
    INodeTypeDescription,
    IDataObject,
    NodeOperationError,
	IRequestOptions,
} from 'n8n-workflow';


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
				// routing: {
				// 	request: {
				// 		method: 'POST',
				// 		url: '/workflows/{{$agentName}}/run'
				// 	}
				// }
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

	// The execute method will go here
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
        const returnData: IDataObject[] = [];

        // Get credentials
        const credentials = await this.getCredentials('RunAgentApi');
        
        for (let i = 0; i < items.length; i++) {
            try {
				// Get node parameters
                const agentName = this.getNodeParameter('agentName', i) as string;
                const workflowVersionNumber = this.getNodeParameter('workflowVersionNumber', i) as string;
                const inputVariables = this.getNodeParameter('inputVariables', i) as string;
                const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
				
				// Parse input variables JSON
                let parsedInputVariables: IDataObject = {};
                try {
                    parsedInputVariables = JSON.parse(inputVariables);
                } catch (error) {
                    throw new NodeOperationError(this.getNode(), `Invalid JSON in Input Variables: ${error.message}`, { itemIndex: i });
                }

                // Build request body
                const requestBody: IDataObject = {
                    input_variables: parsedInputVariables,
                };

                // Add optional parameters
                if (workflowVersionNumber) {
                    requestBody.workflow_version_number = workflowVersionNumber;
                }

                if (additionalFields.metadata) {
                    try {
                        requestBody.metadata = JSON.parse(additionalFields.metadata as string);
                    } catch (error) {
                        throw new NodeOperationError(this.getNode(), `Invalid JSON in Metadata: ${error.message}`, { itemIndex: i });
                    }
                }

                if (additionalFields.returnAllOutputs) {
                    requestBody.return_all_outputs = additionalFields.returnAllOutputs;
                }

                if (additionalFields.workflowLabelName) {
                    requestBody.workflow_label_name = additionalFields.workflowLabelName;
                }

                // Make HTTP request
                const options: IRequestOptions = {
                    method: 'POST',
                    uri: `https://api.promptlayer.com/workflows/${agentName}/run`,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-API-KEY': `${credentials.apiKey}`
                    },
                    body: requestBody,
                    json: true,
                };

                const response = await this.helpers.requestWithAuthentication.call(this, 'RunAgentApi', options);
                // returnData.push(response);

				const execId = response.workflow_version_execution_id as number;
				if (!execId) {
					throw new NodeOperationError(this.getNode(), 'Missing workflow_version_execution_id in response', { itemIndex: i });
				}

				const startTime = Date.now();
				const timeoutMs = 10 * 60_000; // 10 minutes
				let finalResult: any;

				while (Date.now() - startTime < timeoutMs) {
					const getPollingOptions: IRequestOptions = {
						method: 'GET',
						uri: 'https://api.promptlayer.com/workflow-version-execution-results',
						qs: {
							workflow_version_execution_id: execId,
							return_all_outputs: additionalFields.returnAllOutputs,
						},
						headers: {
							'X-API-KEY': `${credentials.apiKey}`
						},
						json: true,
					};

					const pollResponse = await this.helpers.requestWithAuthentication.call(this, 'RunAgentApi', getPollingOptions);

					// TODO: Continue developing the polling loop by getting the status code. It's currently undefined.
					// Helpful tip: use the following command to quickly update the packages
					// cd /home/laaettr/thinkBot/prompt_layer && npm run build && cd /home/laaettr/.n8n/custom/ && npm link n8n-nodes-RunAgent && n8n start
					const statusCode = pollResponse.statusCode;
					console.log(`pollResponse: ${pollResponse}`);
					console.log(`statusCode: ${statusCode}`);

					if (statusCode === 200) {
						finalResult = pollResponse;
						break;
					} else if (statusCode === 202) {
						await new Promise(res => setTimeout(res, 5000)); // wait 5 seconds
					} else {
						throw new NodeOperationError(this.getNode(), `Unexpected status code ${statusCode}`, { itemIndex: i });
					}
				}

				if (!finalResult) {
					throw new NodeOperationError(this.getNode(), 'Execution timed out after 10 minutes', { itemIndex: i });
				}

				returnData.push(finalResult);

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ 
                        error: error.message,
                        json: {},
                        pairedItem: { item: i }
                    });
                } else {
                    throw new NodeOperationError(this.getNode(), `Error executing workflow: ${error.message}`, { itemIndex: i });
                }
            }
        }

        return [this.helpers.returnJsonArray(returnData)];
	}
}