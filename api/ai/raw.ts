import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDeepSeekClient } from '../_lib/deepseek.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body ?? {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing message' });
  }

  try {
    const client = getDeepSeekClient();
    const result = await client.chat.completions.create({
      model: 'deepseek-v4-pro',
      messages: [{ role: 'user', content: message }],
    });
    const text = result.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: 'DeepSeek error' });
  }
}
