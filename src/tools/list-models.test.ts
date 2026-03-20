import { describe, it, expect, vi } from 'vitest';
import { listModels } from './list-models.js';

const makeClient = (data: { id: string }[]) =>
  ({
    models: {
      list: vi.fn().mockResolvedValue({ data }),
    },
  }) as any;

describe('listModels', () => {
  it('maps model IDs to ModelInfo objects', async () => {
    const client = makeClient([{ id: 'gpt-4' }, { id: 'gemini-pro' }]);
    const result = await listModels(client);
    expect(result).toEqual([
      { id: 'gpt-4', name: 'gpt-4', description: 'gpt-4' },
      { id: 'gemini-pro', name: 'gemini-pro', description: 'gemini-pro' },
    ]);
  });

  it('returns empty array when gateway has no models', async () => {
    const client = makeClient([]);
    const result = await listModels(client);
    expect(result).toEqual([]);
  });
});
