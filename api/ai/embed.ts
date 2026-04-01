import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';
import { getSupabase } from '../_lib/supabase.js';
import { generateDishEmbedding } from '../_lib/embeddings.js';

interface DishToEmbed {
  dishName: string;
  ingredients: Array<{ name: string; grams: number; kcal: number }>;
  totalKcal: number;
  prepMinutes?: number;
  humanPortion?: string;
  mealType?: string;
  datePlanned?: string;
}

interface EmbedRequestBody {
  dishes: DishToEmbed[];
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

    const body = req.body as EmbedRequestBody;
    if (!body.dishes || !Array.isArray(body.dishes) || body.dishes.length === 0) {
      return res.status(400).json({ error: 'Missing dishes array' });
    }

    const supabase = getSupabase();
    let created = 0;
    let skipped = 0;

    for (const dish of body.dishes) {
      // Simple dedup: skip if exact dish_name already exists for this user
      const { data: existing } = await supabase
        .from('dish_embeddings')
        .select('id')
        .eq('user_id', userId)
        .eq('dish_name', dish.dishName)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const embedding = await generateDishEmbedding(dish.dishName, dish.ingredients);

      const { error } = await supabase.from('dish_embeddings').insert({
        user_id: userId,
        dish_name: dish.dishName,
        ingredients: dish.ingredients,
        total_kcal: dish.totalKcal,
        prep_minutes: dish.prepMinutes ?? null,
        human_portion: dish.humanPortion ?? null,
        embedding: JSON.stringify(embedding),
        meal_type: dish.mealType ?? null,
        date_planned: dish.datePlanned ?? null,
      });

      if (error) {
        console.error('Failed to insert dish embedding:', dish.dishName, error.message);
      } else {
        created++;
      }
    }

    return res.status(200).json({ ok: true, created, skipped });
  } catch (err) {
    console.error('Embed endpoint error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
