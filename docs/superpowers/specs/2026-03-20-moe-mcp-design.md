# moe-mcp Design Spec
**Date:** 2026-03-20
**Status:** Approved

## Overview

`moe-mcp` is a Model Context Protocol (MCP) server that acts as a Mixture-of-Experts gateway, allowing Claude Code to consult other AI models (e.g. Gemini, GPT) mid-session. Claude can list available models and ask one or many of them a question in parallel.

## Architecture

### Runtime
- **Language:** TypeScript (Node.js)
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **API client:** `openai` npm package (OpenAI-compatible interface)
- **Gateway:** `https://api.ebidoebi.sbs/v1` — OpenAI-compatible proxy

### Project Structure

```
moe-mcp/
├── src/
│   ├── index.ts            # MCP server entry point, tool registration
│   ├── api-client.ts       # OpenAI client singleton, config validation
│   ├── tools/
│   │   ├── list-models.ts  # list_models tool handler
│   │   ├── ask-model.ts    # ask_model tool handler
│   │   └── ask-models.ts   # ask_models tool handler (parallel fan-out)
│   └── types.ts            # Shared TypeScript types
├── package.json
├── tsconfig.json
└── .env                    # MOE_API_BASE_URL, MOE_API_KEY
```

### Configuration

Resolved at startup via environment variables. Server refuses to start if either is missing.

| Variable | Description |
|---|---|
| `MOE_API_BASE_URL` | Gateway base URL, e.g. `https://api.ebidoebi.sbs/v1` |
| `MOE_API_KEY` | Bearer token for the gateway |

## Tools

### `list_models`
Returns all models available on the gateway.

- **Input:** none
- **Output:** `Array<{ id: string, name: string, description: string }>`
- Description field is derived from model metadata or falls back to the model id
- Calls `GET /v1/models` on the gateway

### `ask_model`
Ask a single model a question.

- **Input:**
  - `model_id: string` — model to query
  - `prompt: string` — user message
  - `system?: string` — optional system prompt
- **Output:** `{ model_id: string, response: string }`
- Calls `POST /v1/chat/completions` with a 60s timeout
- Propagates errors as MCP tool errors

### `ask_models`
Ask multiple models the same question in parallel.

- **Input:**
  - `model_ids: string[]` — list of models to query
  - `prompt: string` — user message
  - `system?: string` — optional system prompt
- **Output:** `{ results: Array<{ model_id: string, response: string } | { model_id: string, error: string }> }`
- Uses `Promise.all` for true parallel fan-out
- Per-model error isolation: a failure in one model does not affect others
- 60s timeout per model call

## Error Handling

| Scenario | Behavior |
|---|---|
| Missing env vars at startup | Server exits with descriptive error message |
| `list_models` API failure | Propagated as MCP tool error |
| `ask_model` API failure | Propagated as MCP tool error |
| `ask_models` single model failure | Captured in per-model `error` field; other results still returned |
| Timeout (>60s) | Treated as a model-level error |

## Data Flow

```
Claude Code
    │
    ▼
moe-mcp MCP Server (stdio)
    │
    ├── list_models ──────────────────► GET /v1/models
    │
    ├── ask_model ────────────────────► POST /v1/chat/completions
    │
    └── ask_models
            ├── Promise.all
            ├── model-a ──────────────► POST /v1/chat/completions
            ├── model-b ──────────────► POST /v1/chat/completions
            └── model-c ──────────────► POST /v1/chat/completions
```

## Non-Goals

- No streaming responses (MCP tools are request/response)
- No response synthesis or comparison logic (Claude Code handles interpretation)
- No caching of model responses
- No per-model configuration beyond what the gateway exposes
