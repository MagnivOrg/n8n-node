import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	NodeOperationError,
	IRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	sleep,
} from 'n8n-workflow';

/**
 * RunAgent Node for n8n
 *
 * This node allows users to execute PromptLayer Agents through the PromptLayer API.
 * It supports Agent execution with input variables, version control, and metadata.
 * The node handles asynchronous execution with polling for completion status.
 *
 * @class PromptLayerRunAgent
 * @implements {INodeType}
 */
export class PromptLayerRunAgent implements INodeType {
	/**
	 * Node description containing all configuration, properties, and metadata
	 * for the RunAgent node in the n8n workflow editor.
	 */
	description: INodeTypeDescription = {
		// Basic node details will go here
		displayName: 'PromptLayer Run Agent',
		name: 'promptLayerRunAgent',
		icon: 'file:runAgent.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Run PromptLayer Agent',
		description: 'Run an Agent from the PromptLayer API',
		defaults: {
			name: 'PromptLayer Run Agent',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'runAgentApi',
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
				// User must provide the name of the agent to run. Use loadOptions in the future if want to have a dropdown menu
				displayName: 'Agent Name or ID',
				name: 'agentName',
				type: 'options',
				default: '',
				required: true,
				description:
					'The name of the Agent to execute. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getWorkflows',
				},
			},
			{
				displayName: 'Use Agent Label Name',
				name: 'useAgentLabel',
				type: 'boolean',
				default: false,
				description: 'Whether to use Agent Label Name instead of Agent Version Number',
			},
			{
				displayName: 'Agent Version Number',
				name: 'agentVersionNumber',
				type: 'number',
				default: '',
				placeholder: '0',
				description: 'Specify an Agent version number to run a specific version',
				displayOptions: {
					show: {
						useAgentLabel: [false],
					},
				},
			},
			{
				displayName: 'Agent Label Name',
				name: 'agentLabelName',
				type: 'string',
				default: '',
				description: 'Specify an Agent label name to run a specific labeled version',
				displayOptions: {
					show: {
						useAgentLabel: [true],
					},
				},
			},
			{
				displayName: 'Input Variables',
				name: 'inputVariables',
				type: 'json',
				default: '{}',
				description: 'A dictionary of input variables required by the Agent',
			},
			{
				displayName:
					'Looking for custom n8n nodes or solutions? <a href="https://thinkbot.agency/?utm_source=n8n&utm_medium=node&utm_campaign=promptlayer" target="_blank">thinkbot.agency</a>',
				name: 'thinkbotAdvert',
				type: 'notice',
				default: '',
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
						description: 'A JSON of metadata key-value pairs',
					},
					{
						displayName: 'Return All Outputs',
						name: 'returnAllOutputs',
						type: 'boolean',
						default: false,
						description: 'Whether to return all outputs from the Agent execution',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						default: 10,
						description:
							'Maximum time (in minutes) to wait for agent execution before timing out. Default is 10 minutes.',
						typeOptions: {
							minValue: 1,
						},
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			/**
			 * Fetches available PromptLayer agents for the dropdown in the Agent Name field.
			 *
			 * This method is used by n8n's loadOptions system to dynamically populate the dropdown
			 * with all available agents from the PromptLayer API. It authenticates using the user's
			 * credentials, sends a GET request to /workflows, and maps the response to the format
			 * required by n8n dropdowns (name/value pairs).
			 *
			 * @param {ILoadOptionsFunctions} this - n8n context for loadOptions
			 * @returns {Promise<INodePropertyOptions[]>} Array of dropdown options for agents
			 */
			async getWorkflows(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// Retrieve API credentials from n8n credential store
				const credentials = await this.getCredentials('runAgentApi');
				const returnData: INodePropertyOptions[] = [];
				let page = 1;
				const perPage = 100;
				let hasNext = true;

				while (hasNext) {
					const options: IRequestOptions = {
						method: 'GET',
						url: `https://api.promptlayer.com/workflows`,
						qs: {
							page,
							per_page: perPage,
						},
						headers: {
							Accept: 'application/json',
							'Content-Type': 'application/json',
							'X-API-KEY': String(credentials.apiKey),
						},
						json: true,
					};
					const response = await this.helpers.request!(options);
					for (const agent of response.items) {
						const name = agent.name;
						returnData.push({
							name: name,
							value: name,
						});
					}
					hasNext = response.has_next;
					page = response.next_num || page + 1;
				}
				return returnData;
			},
		},
	};

	/**
	 * Main execution method for the PromptLayerRunAgent node.
	 *
	 * This method processes each input item and executes the specified PromptLayer Agent.
	 * It handles the following Agent process:
	 * 1. Validates and parses input parameters
	 * 2. Constructs the API request body
	 * 3. Initiates Agent execution via POST request
	 * 4. Polls for completion status with timeout handling, 10 minutes
	 * 5. Returns the final execution results
	 *
	 * @async
	 * @param {IExecuteFunctions} this - The execution context containing helper methods and node information
	 * @returns {Promise<INodeExecutionData[][]>} Array of execution results for each input item
	 * @throws {NodeOperationError} When required parameters are missing, JSON parsing fails, or API requests fail
	 */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		// Get credentials
		const credentials = await this.getCredentials('runAgentApi');

		for (let i = 0; i < items.length; i++) {
			try {
				// Get node parameters
				const agentName = this.getNodeParameter('agentName', i) as string;
				const useAgentLabel = this.getNodeParameter('useAgentLabel', i) === true;
				const agentVersionNumber = !useAgentLabel
					? Number(this.getNodeParameter('agentVersionNumber', i, null))
					: null;
				const agentLabelName = useAgentLabel
					? (this.getNodeParameter('agentLabelName', i, '') as string)
					: '';
				const inputVariables = this.getNodeParameter('inputVariables', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

				// Parse input variables JSON
				let parsedInputVariables: IDataObject = {};
				try {
					parsedInputVariables = JSON.parse(inputVariables);
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Invalid JSON in Input Variables: ${error.message}`,
						{ itemIndex: i },
					);
				}

				// Build request body
				const requestBody: IDataObject = {
					input_variables: parsedInputVariables,
				};

				// Add optional parameters
				if (agentVersionNumber) {
					requestBody.workflow_version_number = agentVersionNumber;
				}

				if (agentLabelName) {
					requestBody.workflow_label_name = agentLabelName;
				}

				if (additionalFields.metadata) {
					try {
						requestBody.metadata = JSON.parse(additionalFields.metadata as string);
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							`Invalid JSON in Metadata: ${error.message}`,
							{ itemIndex: i },
						);
					}
				}

				// Always include return_all_outputs parameter, defaulting to false if not specified
				requestBody.return_all_outputs = additionalFields.returnAllOutputs || false;

				// Make HTTP request to initiate Agent execution
				const options: IRequestOptions = {
					method: 'POST',
					uri: `https://api.promptlayer.com/workflows/${agentName}/run`,
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
						'X-API-KEY': `${credentials.apiKey}`,
					},
					body: requestBody,
					json: true,
				};

				const response = await this.helpers.requestWithAuthentication.call(
					this,
					'runAgentApi',
					options,
				);

				// Extract execution ID from response
				const execId = response.workflow_version_execution_id as number;
				if (!execId) {
					throw new NodeOperationError(
						this.getNode(),
						'Missing workflow_version_execution_id in response',
						{ itemIndex: i },
					);
				}

				// Poll for completion with timeout
				const startTime = Date.now();
				const timeoutMinutes =
					additionalFields.timeout !== undefined ? Number(additionalFields.timeout) : 10;
				const timeoutMs = timeoutMinutes * 60_000; // Use user-provided or default 10 minutes
				let finalResult: any;

				while (Date.now() - startTime < timeoutMs) {
					const getPollingOptions: IRequestOptions = {
						method: 'GET',
						uri: 'https://api.promptlayer.com/workflow-version-execution-results',
						qs: {
							workflow_version_execution_id: execId,
							return_all_outputs: additionalFields.returnAllOutputs || false,
						},
						headers: {
							'X-API-KEY': `${credentials.apiKey}`,
						},
						json: true,
					};

					const pollResponse = await this.helpers.requestWithAuthentication.call(
						this,
						'runAgentApi',
						{ ...getPollingOptions, resolveWithFullResponse: true },
					);
					const statusCode = pollResponse.statusCode;

					if (statusCode === 200 && pollResponse.statusMessage === 'OK') {
						// Agent completed successfully
						finalResult = { body: pollResponse.body };
						break;
					} else if (statusCode === 202) {
						// Agent still processing, wait before polling again
						await sleep(5000); // wait 5 seconds
					} else {
						throw new NodeOperationError(this.getNode(), `Unexpected status code ${statusCode}`, {
							itemIndex: i,
						});
					}
				}

				if (!finalResult) {
					throw new NodeOperationError(this.getNode(), 'Execution timed out after 10 minutes', {
						itemIndex: i,
					});
				}

				returnData.push(finalResult);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						error: error.message,
						json: {},
						pairedItem: { item: i },
					});
				} else {
					throw new NodeOperationError(this.getNode(), `Error executing Agent: ${error.message}`, {
						itemIndex: i,
					});
				}
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
