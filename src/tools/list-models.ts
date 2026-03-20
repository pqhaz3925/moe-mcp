import type OpenAI from 'openai';
import type { ModelInfo } from '../types.js';

export async function listModels(client: OpenAI): Promise<ModelInfo[]> {
  const response = await client.models.list();
  return response.data.map((model) => ({
    id: model.id,
    name: model.id,
    description: model.id,
  }));
}
