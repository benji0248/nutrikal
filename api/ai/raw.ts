import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDeepSeekClient } from '../_lib/deepseek.js';
import {
  buildSystemPrompt,
  extractRecentDishNames,
  type GemProfile,
} from '../_lib/gemini.js';

interface RawRequestBody {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Para pruebas sin auth: ej. "Argentina" o "ar" */
  nationality?: string;
  restrictions?: string[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = (req.body ?? {}) as RawRequestBody;
  const { message, history, nationality, restrictions } = body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing message' });
  }

  const profile: GemProfile = {
    nationality: typeof nationality === 'string' ? nationality : undefined,
    restrictions: Array.isArray(restrictions) ? restrictions : undefined,
  };

  const recentDishes = extractRecentDishNames(
    (history ?? []).map((m) => ({ role: m.role, content: m.content })),
  );
  const systemPrompt = buildSystemPrompt(profile, { recentDishes });

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of history ?? []) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
  messages.push({ role: 'user', content: message });

  try {
    const client = getDeepSeekClient();
    const result = await client.chat.completions.create({
      model: 'deepseek-v4-pro',
      messages,
      temperature: 1,
      top_p: 0.95,
    });
    const text = result.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ text, recentDishesAvoided: recentDishes });
  } catch {
    return res.status(500).json({ error: 'DeepSeek error' });
  }
}
