import type OpenAI from 'openai';
import type { AskSuccess } from '../types.js';

export async function askModel(
  client: OpenAI,
  model_id: string,
  prompt: string,
  system?: string,
  max_tokens?: number,
): Promise<AskSuccess> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const completion = await client.chat.completions.create({
    model: model_id,
    messages,
    ...(max_tokens !== undefined && { max_tokens }),
  });
  const response = completion.choices[0]?.message?.content ?? '';
  return { model_id, response };
}
