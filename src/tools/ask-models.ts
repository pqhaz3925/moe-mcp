import type OpenAI from 'openai';
import type { AskResult } from '../types.js';
import { askModel } from './ask-model.js';

export async function askModels(
  client: OpenAI,
  model_ids: string[],
  prompt: string,
  system?: string,
  max_tokens = 8192,
): Promise<{ results: AskResult[] }> {
  if (model_ids.length === 0) return { results: [] };

  const settled = await Promise.allSettled(
    model_ids.map((id) => askModel(client, id, prompt, system, max_tokens)),
  );

  const results: AskResult[] = settled.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    return { model_id: model_ids[i], error: String(result.reason) };
  });

  return { results };
}
