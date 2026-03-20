import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { openai } from './api-client.js';
import { listModels } from './tools/list-models.js';
import { askModel } from './tools/ask-model.js';
import { askModels } from './tools/ask-models.js';

const server = new McpServer({ name: 'moe-mcp', version: '1.0.0' });

server.registerTool(
  'list_models',
  {
    description:
      'List all AI models available on the gateway. Call this first to discover model IDs for use with ask_model or ask_models.',
    inputSchema: {},
  },
  async () => {
    const models = await listModels(openai);
    return {
      content: [{ type: 'text', text: JSON.stringify(models, null, 2) }],
    };
  },
);

server.registerTool(
  'ask_model',
  {
    description: 'Ask a single AI model a question and get its response.',
    inputSchema: {
      model_id: z.string().describe('Model ID to query. Use list_models to discover available IDs.'),
      prompt: z.string().describe('The question or prompt to send to the model.'),
      system: z.string().optional().describe('Optional system prompt to set context or persona.'),
      max_tokens: z.number().int().positive().optional().describe('Max tokens in the response. Useful to cap thinking models.'),
      budget_tokens: z.number().int().positive().optional().describe('Shorthand for thinking.budget_tokens — enables extended thinking with this token budget.'),
      thinking: z.object({
        type: z.string().optional(),
        budget_tokens: z.number().int().positive().optional(),
      }).optional().describe('Extended thinking config. { budget_tokens } or { type: "enabled", budget_tokens } — both work.'),
    },
  },
  async ({ model_id, prompt, system, max_tokens, thinking, budget_tokens }) => {
    const result = await askModel(openai, model_id, prompt, system, max_tokens, thinking, budget_tokens);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'ask_models',
  {
    description:
      'Ask multiple AI models the same question in parallel and compare their responses. Failed models return an error field instead of response.',
    inputSchema: {
      model_ids: z.array(z.string()).describe('List of model IDs to query simultaneously.'),
      prompt: z.string().describe('The question or prompt to send to all models.'),
      system: z.string().optional().describe('Optional system prompt applied to all models.'),
      max_tokens: z.number().int().positive().optional().describe('Max tokens per model response. Useful to cap thinking models.'),
      budget_tokens: z.number().int().positive().optional().describe('Shorthand for thinking.budget_tokens — enables extended thinking with this token budget.'),
      thinking: z.object({
        type: z.string().optional(),
        budget_tokens: z.number().int().positive().optional(),
      }).optional().describe('Extended thinking config. { budget_tokens } or { type: "enabled", budget_tokens } — both work.'),
    },
  },
  async ({ model_ids, prompt, system, max_tokens, thinking, budget_tokens }) => {
    const result = await askModels(openai, model_ids, prompt, system, max_tokens, thinking, budget_tokens);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[moe-mcp] running on stdio');
}

main().catch((error) => {
  console.error('[moe-mcp] Fatal error:', error);
  process.exit(1);
});
