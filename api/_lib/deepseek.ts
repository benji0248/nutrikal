import OpenAI from 'openai';

let client: OpenAI | null = null;

export function getDeepSeekClient(): OpenAI {
  if (client) return client;

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('Missing DEEPSEEK_API_KEY');

  client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: key,
  });

  return client;
}
