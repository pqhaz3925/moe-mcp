import OpenAI from 'openai';

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.error(`[moe-mcp] Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return val;
}

export const openai = new OpenAI({
  apiKey: requireEnv('MOE_API_KEY'),
  baseURL: requireEnv('MOE_API_BASE_URL'),
  timeout: 60_000,
});
