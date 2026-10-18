import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '../types';
import { DEFAULT_WEEK_PLANNING } from '../types';
import { buildFullWeekPlanFromApiResponse, buildWeekPlanningContext } from './weekPlanService';
import { getDefaultPlanStartDate, getPlanningDayKeys, getWeekDayKeys, isValidPlanStartDate } from '../utils/dateHelpers';

const profile: UserProfile = {
  id: 'test-user', name: 'Test', birthDate: '1990-01-01', sex: 'male',
  heightCm: 175, weightKg: 75, activityLevel: 'moderate', goal: 'maintain',
  restrictions: [], dislikedIngredientIds: [], createdAt: '', updatedAt: '', lastRecalibration: '',
};

describe('weekly planning dates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Local calendar date, independent of the machine's UTC offset.
    vi.setSystemTime(new Date(2026, 9, 18, 23, 30));
  });
  afterEach(() => vi.useRealTimers());

  it('plans October 19–25 when generated on Sunday October 18', () => {
    const ctx = buildWeekPlanningContext(profile, {}, []);
    expect(getDefaultPlanStartDate()).toBe('2026-10-19');
    expect(ctx.weekDates).toEqual([
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22',
      '2026-10-23', '2026-10-24', '2026-10-25',
    ]);
    expect(ctx.weekId).toBe('2026-W43');
    expect(ctx.pool.weekId).toBe(ctx.weekId);
  });

  it('preserves a selected midweek start instead of moving it back to Monday', () => {
    const ctx = buildWeekPlanningContext(profile, {}, [], '2026-10-21');
    expect(ctx.weekDates).toEqual([
      '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24',
      '2026-10-25', '2026-10-26', '2026-10-27',
    ]);
    const plan = buildFullWeekPlanFromApiResponse({
      skeleton: { days: ctx.weekDates.map((date) => ({ date, slots: [] })) },
      rawDishes: {}, profile,
      weekPlanning: { ...DEFAULT_WEEK_PLANNING, completedAt: '2026-10-18T12:00:00Z' },
    });
    expect(plan.days.map((day) => day.date)).toEqual(ctx.weekDates);
    expect(plan.applied).toBe(false);
  });

  it('lets the user start today without including previous days', () => {
    const ctx = buildWeekPlanningContext(profile, {}, [], '2026-10-18');
    expect(ctx.weekDates[0]).toBe('2026-10-18');
    expect(ctx.weekDates.at(-1)).toBe('2026-10-24');
    expect(isValidPlanStartDate('2026-10-18')).toBe(true);
  });

  it('handles month and year boundaries with the target ISO week', () => {
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59));
    const ctx = buildWeekPlanningContext(profile, {}, []);
    expect(ctx.weekDates[0]).toBe('2027-01-01');
    expect(ctx.weekDates.at(-1)).toBe('2027-01-07');
    expect(ctx.weekId).toBe('2026-W53');
  });

  it('handles leap days in the selected seven-day range', () => {
    expect(getPlanningDayKeys('2028-02-27')).toEqual([
      '2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01',
      '2028-03-02', '2028-03-03', '2028-03-04',
    ]);
  });

  it('keeps calendar navigation aligned to Monday through Sunday', () => {
    const dates = getWeekDayKeys('2026-10-18');
    expect(dates[0]).toBe('2026-10-12');
    expect(dates.at(-1)).toBe('2026-10-18');
  });

  it.each(['', 'invalid', '2026-02-30', '2026-13-01', '2026-10-17'])(
    'rejects invalid or past start dates: %s', (date) => {
      expect(isValidPlanStartDate(date)).toBe(false);
    },
  );
});
