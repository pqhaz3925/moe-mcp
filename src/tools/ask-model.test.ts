import { describe, it, expect, vi } from 'vitest';
import { askModel } from './ask-model.js';

const mockCompletion = (content: string) => ({
  choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop', index: 0 }],
  id: 'test-id',
  created: 0,
  model: 'gpt-4',
  object: 'chat.completion',
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

    expect(create).toHaveBeenCalledWith({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'be concise' },
        { role: 'user', content: 'prompt' },
      ],
    });
  });

  it('omits system message when not provided', async () => {
    const create = vi.fn().mockResolvedValue(mockCompletion('ok'));
    const client = { chat: { completions: { create } } } as any;

    await askModel(client, 'gpt-4', 'prompt');

    expect(create).toHaveBeenCalledWith({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'prompt' }],
    });
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
