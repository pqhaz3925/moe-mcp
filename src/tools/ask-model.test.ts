import { describe, it, expect, vi } from 'vitest';
import { askModel, normalizeThinking } from './ask-model.js';

const mockCompletion = (content: string) => ({
  choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop', index: 0 }],
  id: 'test-id',
  created: 0,
  model: 'gpt-4',
  object: 'chat.completion',
});

describe('normalizeThinking', () => {
  it('returns undefined when nothing provided', () => {
    expect(normalizeThinking()).toBeUndefined();
    expect(normalizeThinking(undefined, undefined)).toBeUndefined();
  });

  it('Option 1: top-level budget_tokens', () => {
    expect(normalizeThinking(undefined, 1500)).toEqual({ type: 'enabled', budget_tokens: 1500 });
  });

  it('Option 2: thinking object without type', () => {
    expect(normalizeThinking({ budget_tokens: 1500 })).toEqual({ type: 'enabled', budget_tokens: 1500 });
  });

  it('Option 3: full explicit form', () => {
    expect(normalizeThinking({ type: 'enabled', budget_tokens: 1500 })).toEqual({ type: 'enabled', budget_tokens: 1500 });
  });

  it('top-level budget_tokens takes precedence over thinking object', () => {
    expect(normalizeThinking({ budget_tokens: 999 }, 1500)).toEqual({ type: 'enabled', budget_tokens: 1500 });
  });
});

describe('askModel', () => {
  it('returns model_id and response content', async () => {
    const create = vi.fn().mockResolvedValue(mockCompletion('Hello!'));
    const client = { chat: { completions: { create } } } as any;

    const result = await askModel(client, 'gpt-4', 'Say hi');

    expect(result).toEqual({ model_id: 'gpt-4', response: 'Hello!' });
  });

  it('sends system message when provided', async () => {
    const create = vi.fn().mockResolvedValue(mockCompletion('ok'));
    const client = { chat: { completions: { create } } } as any;

    await askModel(client, 'gpt-4', 'prompt', 'be concise');

    expect(create).toHaveBeenCalledWith(
      {
        model: 'gpt-4',
        max_tokens: 8192,
        messages: [
          { role: 'system', content: 'be concise' },
          { role: 'user', content: 'prompt' },
        ],
      },
      { signal: expect.any(Object) },
    );
  });

  it('omits system message when not provided', async () => {
    const create = vi.fn().mockResolvedValue(mockCompletion('ok'));
    const client = { chat: { completions: { create } } } as any;

    await askModel(client, 'gpt-4', 'prompt');

    expect(create).toHaveBeenCalledWith(
      {
        model: 'gpt-4',
        max_tokens: 8192,
        messages: [{ role: 'user', content: 'prompt' }],
      },
      { signal: expect.any(Object) },
    );
  });

  it('sends thinking param when budget_tokens provided', async () => {
    const create = vi.fn().mockResolvedValue(mockCompletion('ok'));
    const client = { chat: { completions: { create } } } as any;

    await askModel(client, 'claude-opus-4-6', 'prompt', undefined, 8192, undefined, 1500);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ thinking: { type: 'enabled', budget_tokens: 1500 } }),
      { signal: expect.any(Object) },
    );
  });

  it('omits thinking param when not provided', async () => {
    const create = vi.fn().mockResolvedValue(mockCompletion('ok'));
    const client = { chat: { completions: { create } } } as any;

    await askModel(client, 'gpt-4', 'prompt');

    expect(create).toHaveBeenCalledWith(
      expect.not.objectContaining({ thinking: expect.anything() }),
      { signal: expect.any(Object) },
    );
  });

  it('returns empty string when content is empty', async () => {
    const create = vi.fn().mockResolvedValue(mockCompletion(''));
    const client = { chat: { completions: { create } } } as any;

    const result = await askModel(client, 'gpt-4', 'prompt');

    expect(result.response).toBe('');
  });

  it('propagates API errors', async () => {
    const create = vi.fn().mockRejectedValue(new Error('rate limited'));
    const client = { chat: { completions: { create } } } as any;

    await expect(askModel(client, 'gpt-4', 'prompt')).rejects.toThrow('rate limited');
  });
});

