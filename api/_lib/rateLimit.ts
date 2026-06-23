import { getSupabase } from './supabase.js';
import { redactUserId } from './chatFlowLog.js';

const DAILY_LIMIT = 80;

export async function getTodayAiUsageCount(userId: string): Promise<number> {
  const supabase = getSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();

  if (error) return 0;
  return typeof data?.count === 'number' ? data.count : 0;
}

/**
 * Read-only: true if another successful chat can still be recorded today.
 */
export async function assertUnderDailyAiLimit(
  userId: string,
): Promise<{ allowed: true; remaining: number } | { allowed: false; remaining: 0 }> {
  const count = await getTodayAiUsageCount(userId);
  if (count >= DAILY_LIMIT) {
    console.log(
      '[nutrikal:chat:usage]',
      JSON.stringify({ phase: 'assert', allowed: false, user: redactUserId(userId), count, ts: new Date().toISOString() }),
    );
    return { allowed: false, remaining: 0 };
  }
  console.log(
    '[nutrikal:chat:usage]',
    JSON.stringify({ phase: 'assert', allowed: true, user: redactUserId(userId), count, remaining: DAILY_LIMIT - count, ts: new Date().toISOString() }),
  );
  return { allowed: true, remaining: DAILY_LIMIT - count };
}

/**
 * Call once after a successful Gemini response. Does not run on network/model errors.
 */
export async function recordSuccessfulAiChat(userId: string): Promise<{ remaining: number }> {
  const supabase = getSupabase();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase.rpc('increment_ai_usage', {
    p_user_id: userId,
    p_date: today,
  });

  if (!error && typeof data === 'number') {
    const remaining = Math.max(0, DAILY_LIMIT - data);
    console.log(
      '[nutrikal:chat:usage]',
      JSON.stringify({ phase: 'record_ok_rpc', user: redactUserId(userId), countAfter: data, remaining, ts: new Date().toISOString() }),
    );
    return { remaining };
  }

  console.log(
    '[nutrikal:chat:usage]',
    JSON.stringify({ phase: 'record_fallback_manual', user: redactUserId(userId), rpcError: error?.message ?? 'unknown', ts: new Date().toISOString() }),
  );

  const { data: existing } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();

  const currentCount = existing?.count ?? 0;
  const nextCount = currentCount + 1;

  if (existing) {
    await supabase
      .from('ai_usage')
      .update({ count: nextCount })
      .eq('user_id', userId)
      .eq('usage_date', today);
  } else {
    await supabase.from('ai_usage').insert({
      user_id: userId,
      usage_date: today,
      count: 1,
    });
  }

  const remaining = Math.max(0, DAILY_LIMIT - nextCount);
  console.log(
    '[nutrikal:chat:usage]',
    JSON.stringify({ phase: 'record_ok_manual', user: redactUserId(userId), countAfter: nextCount, remaining, ts: new Date().toISOString() }),
  );
  return { remaining };
}
