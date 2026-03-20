import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { openai } from './api-client.js';
import { listModels } from './tools/list-models.js';
import { askModel } from './tools/ask-model.js';
import { askModels } from './tools/ask-models.js';

const PORT = Number(process.env.PORT ?? 3333);
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

function createMcpServer(): McpServer {
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
      return { content: [{ type: 'text', text: JSON.stringify(models, null, 2) }] };
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
      },
    },
    async ({ model_id, prompt, system }) => {
      const result = await askModel(openai, model_id, prompt, system);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
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
      },
    },
    async ({ model_ids, prompt, system }) => {
      const result = await askModels(openai, model_ids, prompt, system);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}

// Stateless mode: each request gets a fresh transport + server instance
const httpServer = createServer(async (req, res) => {
  // Bearer token auth (skip for health check)
  if (AUTH_TOKEN && req.url !== '/health') {
    const authHeader = req.headers['authorization'] ?? '';
    if (authHeader !== `Bearer ${AUTH_TOKEN}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
  }

  if (req.method === 'POST' && req.url === '/mcp') {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res);
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', server: 'moe-mcp' }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.error(`[moe-mcp] HTTP server running on 0.0.0.0:${PORT}`);
  console.error(`[moe-mcp] MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
});
