import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiClient } from '../_lib/gemini.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body ?? {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing message' });
  }

  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(message);
    const text = result.response.text();

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: 'Gemini error' });
  }
}
