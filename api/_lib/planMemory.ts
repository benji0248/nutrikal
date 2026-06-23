export interface PlanMemoryPayload {
  avoidDishNames: string[];
  poolGeneration: number;
  lastWeekId: string | null;
  recentPoolHistory: string[][];
}

const MAX_AVOID = 96;
const MAX_POOL_HISTORY = 5;

export function normalizePlanMemory(raw: unknown): PlanMemoryPayload {
  if (!raw || typeof raw !== 'object') {
    return { avoidDishNames: [], poolGeneration: 0, lastWeekId: null, recentPoolHistory: [] };
  }
  const o = raw as Record<string, unknown>;
  const names = Array.isArray(o.avoidDishNames)
    ? o.avoidDishNames.filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
    : [];
  const seen = new Set<string>();
  const avoidDishNames: string[] = [];
  for (const n of names) {
    const t = n.trim();
    if (seen.has(t)) continue;
    seen.add(t);
    avoidDishNames.push(t);
  }
  const poolGeneration =
    typeof o.poolGeneration === 'number' && o.poolGeneration >= 0
      ? Math.floor(o.poolGeneration)
      : 0;
  const lastWeekId = typeof o.lastWeekId === 'string' ? o.lastWeekId : null;
  const recentPoolHistory = Array.isArray(o.recentPoolHistory)
    ? o.recentPoolHistory
        .filter((p): p is string[] => Array.isArray(p))
        .map((p) => p.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
        .slice(-MAX_POOL_HISTORY)
    : [];
  return {
    avoidDishNames: avoidDishNames.slice(-MAX_AVOID),
    poolGeneration,
    lastWeekId,
    recentPoolHistory,
  };
}
