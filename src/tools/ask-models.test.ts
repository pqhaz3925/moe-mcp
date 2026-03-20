import { describe, it, expect, vi } from 'vitest';
import { askModels } from './ask-models.js';

describe('askModels', () => {
  it('returns empty results immediately for empty model_ids', async () => {
    const client = {} as any;
    const result = await askModels(client, [], 'prompt');
    expect(result).toEqual({ results: [] });
  });

  it('returns all responses when all models succeed', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ choices: [{ message: { content: 'A response' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: 'B response' } }] });
    const client = { chat: { completions: { create } } } as any;

    const result = await askModels(client, ['model-a', 'model-b'], 'Say hi');

    expect(result.results).toEqual([
      { model_id: 'model-a', response: 'A response' },
      { model_id: 'model-b', response: 'B response' },
    ]);
  });

  it('captures failed models without affecting successful ones', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ choices: [{ message: { content: 'ok' } }] })
      .mockRejectedValueOnce(new Error('model-b is unavailable'));
    const client = { chat: { completions: { create } } } as any;

    const result = await askModels(client, ['model-a', 'model-b'], 'prompt');

    expect(result.results[0]).toEqual({ model_id: 'model-a', response: 'ok' });
    expect(result.results[1]).toMatchObject({
      model_id: 'model-b',
      error: expect.stringContaining('model-b is unavailable'),
    });
  });

  it('passes system prompt to all models', async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ choices: [{ message: { content: 'x' } }] });
    const client = { chat: { completions: { create } } } as any;

    await askModels(client, ['model-a', 'model-b'], 'prompt', 'be brief');

    for (const call of create.mock.calls) {
      expect(call[0].messages[0]).toEqual({ role: 'system', content: 'be brief' });
    }
  });
});
