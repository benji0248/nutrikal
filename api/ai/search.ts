import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';
import { getSupabase } from '../_lib/supabase.js';
import { generateDishEmbedding } from '../_lib/embeddings.js';

interface SearchRequestBody {
  query: string;
  limit?: number;
  mealType?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization' });
    }

    let userId: string;
    try {
      const payload = verifyToken(authHeader.slice(7));
      userId = payload.sub;
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const body = req.body as SearchRequestBody;
    if (!body.query || typeof body.query !== 'string') {
      return res.status(400).json({ error: 'Missing query string' });
    }

    const embedding = await generateDishEmbedding(body.query, []);
    const matchCount = Math.min(body.limit ?? 10, 50);

    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('find_similar_dishes', {
      query_embedding: JSON.stringify(embedding),
      user_uuid: userId,
      match_threshold: 0.7,
      match_count: matchCount,
    });

    if (error) {
      console.error('Semantic search error:', error.message);
      return res.status(500).json({ error: 'Search failed' });
    }

    // Optional: filter by mealType client-side (RPC doesn't filter by it)
    const results = body.mealType
      ? (data ?? []).filter((d: { meal_type: string | null }) => d.meal_type === body.mealType)
      : (data ?? []);

    return res.status(200).json({ results });
  } catch (err) {
    console.error('Search endpoint error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
