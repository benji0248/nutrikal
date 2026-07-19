import type {
  BodyCheckIn,
  Goal,
  ProgressConfidence,
  ProgressFreshness,
  ProgressState,
} from '../types';

export const PROGRESS_SOFT_THRESHOLD_DAYS = 14;
export const PROGRESS_HARD_THRESHOLD_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ProgressAssessment {
  state: ProgressState;
  freshness: ProgressFreshness;
  confidence: ProgressConfidence;
  currentWeightKg?: number;
  deltaFromStartKg?: number;
  latestCheckIn?: BodyCheckIn;
}

function sortedCheckIns(checkIns: BodyCheckIn[]): BodyCheckIn[] {
  return [...checkIns]
    .filter((entry) => Number.isFinite(entry.weightKg) && entry.weightKg > 0)
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );
}

export function daysSince(date: string, now = new Date()): number {
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now.getTime() - timestamp) / DAY_MS);
}

export function getProgressFreshness(
  latestDate: string | undefined,
  now = new Date(),
): ProgressFreshness {
  if (!latestDate) return 'stale';
  const elapsed = daysSince(latestDate, now);
  if (elapsed < PROGRESS_SOFT_THRESHOLD_DAYS) return 'fresh';
  if (elapsed < PROGRESS_HARD_THRESHOLD_DAYS) return 'aging';
  return 'stale';
}

function getConfidence(entries: BodyCheckIn[]): ProgressConfidence {
  if (entries.length < 3) return 'low';
  const spanDays = daysSince(entries[0].recordedAt, new Date(entries.at(-1)!.recordedAt));
  const netDirection = Math.sign(
    entries.at(-1)!.weightKg - entries[0].weightKg,
  );
  const alignedIntervals = entries.slice(1).filter((entry, index) => {
    const previous = entries[index].weightKg;
    const relativeStep = (entry.weightKg - previous) / previous;
    if (netDirection === 0) return Math.abs(relativeStep) < 0.005;
    return Math.sign(relativeStep) === netDirection || Math.abs(relativeStep) < 0.002;
  }).length;
  const consistency = alignedIntervals / (entries.length - 1);

  if (entries.length >= 5 && spanDays >= 56 && consistency >= 0.75) {
    return 'high';
  }
  if (spanDays >= 28 && consistency >= 0.6) return 'medium';
  return 'low';
}

function getState(entries: BodyCheckIn[], goal: Goal): ProgressState {
  if (entries.length < 2) return 'insufficient_data';

  const first = entries[0].weightKg;
  const latest = entries.at(-1)!.weightKg;
  const relativeChange = (latest - first) / first;
  const meaningfulChange = 0.005;

  if (Math.abs(relativeChange) < meaningfulChange) {
    return 'stable';
  }

  if (goal === 'lose') return relativeChange < 0 ? 'on_track' : 'off_track';
  if (goal === 'gain') return relativeChange > 0 ? 'on_track' : 'off_track';

  return Math.abs(relativeChange) <= 0.015 ? 'on_track' : 'off_track';
}

export function assessProgress(
  checkIns: BodyCheckIn[],
  goal: Goal,
  now = new Date(),
): ProgressAssessment {
  const entries = sortedCheckIns(checkIns);
  const first = entries[0];
  const latest = entries.at(-1);

  return {
    state: getState(entries, goal),
    freshness: getProgressFreshness(latest?.recordedAt, now),
    confidence: getConfidence(entries),
    currentWeightKg: latest?.weightKg,
    deltaFromStartKg:
      first && latest
        ? Math.round((latest.weightKg - first.weightKg) * 10) / 10
        : undefined,
    latestCheckIn: latest,
  };
}

export function getCheckInPromptLevel(
  checkIns: BodyCheckIn[],
  now = new Date(),
): 'none' | 'soft' | 'hard' {
  const latest = sortedCheckIns(checkIns).at(-1);
  if (!latest) return 'hard';
  const elapsed = daysSince(latest.recordedAt, now);
  if (elapsed >= PROGRESS_HARD_THRESHOLD_DAYS) return 'hard';
  if (elapsed >= PROGRESS_SOFT_THRESHOLD_DAYS) return 'soft';
  return 'none';
}
