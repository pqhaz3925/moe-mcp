import type OpenAI from 'openai';
import type { AskSuccess } from '../types.js';

type ThinkingInput = { type?: string; budget_tokens?: number } | null | undefined;
type ThinkingNormalized = { type: 'enabled'; budget_tokens: number };

/** Normalize all 3 shorthand forms to { type: "enabled", budget_tokens: N }. */
export function normalizeThinking(
  thinking?: ThinkingInput,
  budget_tokens?: number,
): ThinkingNormalized | undefined {
  // Option 1: top-level budget_tokens shorthand
  if (budget_tokens !== undefined) return { type: 'enabled', budget_tokens };
  if (!thinking || thinking.budget_tokens === undefined) return undefined;
  // Option 2: { budget_tokens } — Option 3: { type, budget_tokens } — both normalize the same
  return { type: 'enabled', budget_tokens: thinking.budget_tokens };
}

export async function askModel(
  client: OpenAI,
  model_id: string,
  prompt: string,
  system?: string,
  max_tokens = 8192,
  thinking?: ThinkingInput,
  budget_tokens?: number,
  timeout_ms = 300_000,
): Promise<AskSuccess> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const normalizedThinking = normalizeThinking(thinking, budget_tokens);

  const completion = await client.chat.completions.create(
    {
      model: model_id,
      messages,
      max_tokens,
      ...(normalizedThinking && { thinking: normalizedThinking }),
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
    { signal: AbortSignal.timeout(timeout_ms) },
  );
  const response = completion.choices[0]?.message?.content ?? '';
  return { model_id, response };
}
