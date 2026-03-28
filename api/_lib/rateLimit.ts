import { getSupabase } from './supabase.js';

const DAILY_LIMIT = 80;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const supabase = getSupabase();
  const today = new Date().toISOString().slice(0, 10);

  // Upsert: increment count or create row
  const { data, error } = await supabase.rpc('increment_ai_usage', {
    p_user_id: userId,
    p_date: today,
  });

  // If RPC doesn't exist, fallback to manual upsert
  if (error) {
    // Try manual approach
    const { data: existing } = await supabase
      .from('ai_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .single();

    const currentCount = existing?.count ?? 0;

    if (currentCount >= DAILY_LIMIT) {
      return { allowed: false, remaining: 0 };
    }

    if (existing) {
      await supabase
        .from('ai_usage')
        .update({ count: currentCount + 1 })
        .eq('user_id', userId)
        .eq('usage_date', today);
    } else {
      await supabase
        .from('ai_usage')
        .insert({ user_id: userId, usage_date: today, count: 1 });
    }

    return {
      allowed: true,
      remaining: DAILY_LIMIT - currentCount - 1,
    };
  }

  const newCount = typeof data === 'number' ? data : DAILY_LIMIT;
  return {
    allowed: newCount <= DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - newCount),
  };
}
