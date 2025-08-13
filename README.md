# PromptLayer RunAgent Node for n8n

This package provides a custom n8n node for running [PromptLayer Agents](https://promptlayer.com/) directly from your n8n workflows. The **PromptLayer RunAgent** node allows you to execute PromptLayer Agents, pass input variables, select agent versions or labels, and retrieve results programmatically.

---

## Features

- **Run any PromptLayer Agent** by name from your n8n workflow
- **Select agent version** by number or label
- **Pass input variables** as JSON
- **Attach metadata** to executions
- **Control output** (return all outputs or just the main one)
- **Timeout handling** for long-running agents
- **Credential-based authentication**

---

## Prerequisites

- [n8n](https://n8n.io/) installed (Node.js 20+ required)
- A [PromptLayer](https://promptlayer.com/) account and API key

---

## Installation

1. Clone or download this repository into your n8n custom nodes directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the node:
   ```bash
   npm run build
   ```
4. [Register the custom node with n8n](https://docs.n8n.io/integrations/creating-nodes/build/node-development-environment/#load-custom-nodes) if needed.

---

## Configuration

### Setting up Credentials

1. In n8n, go to **Credentials**.
2. Create new credentials for **PromptLayerRunAgentApi**.
3. Enter your PromptLayer API key.

---

## Usage

1. Add the **PromptLayer RunAgent** node to your workflow.
2. Configure the following fields:
   - **Agent Name**: Select the name of the agent to run.
   - **Use Agent Label Name**: Toggle to use a label instead of a version number.
   - **Agent Version Number**: (Optional) Specify a version number (if not using label). By default the latest version of the agent is used.
   - **Agent Label Name**: (Optional) Specify a label name (if using label). By default the latest version of the agent is used.
   - **Input Variables**: JSON object of variables required by the agent (e.g., `{ "question": "What is the weather?" }`).
   - **Additional Fields**:
     - **Metadata**: (Optional) JSON object of metadata to attach.
     - **Return All Outputs**: (Optional) Return all outputs from the agent.
     - **Timeout**: (Optional) Maximum wait time in minutes (default: 10).
3. Connect the node as needed in your workflow.
4. Run the workflow. The node will execute the agent and return the results.

---

## Example

Suppose you have a PromptLayer agent named `weatherAgent` that takes a `location` variable:

- **Agent Name**: `weatherAgent`
- **Input Variables**: `{ "location": "London" }`
- **Return All Outputs**: `false`

The node will execute the agent and return the weather information for London.

---

## Troubleshooting

- Ensure your PromptLayer API key is correct and has access to the agent.
- Input variables and metadata must be valid JSON.
- If the agent takes too long, increase the timeout in Additional Fields.
