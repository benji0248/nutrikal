import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../types';
import {
  buildActionsForSurface,
  buildWelcomeOptions,
  deriveSurfaceFromMessages,
  getTrailingOptions,
  optionsIncludeWeekPlan,
  planChatLifecycle,
  resolveSurfaceForEngineMode,
  shouldAppendSurfaceOptions,
  surfaceExpectsWeekPlan,
  trailingOptionsMatchSurface,
  type ChatSurface,
} from './chatLifecycle';

function msg(
  partial: Pick<ChatMessage, 'type'> & Partial<ChatMessage> & { id?: string },
): ChatMessage {
  return {
    id: partial.id ?? `m-${partial.type}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...partial,
  };
}

function opts(surface: ChatSurface, ctx?: { mealType?: 'snack' | 'almuerzo' }): ChatMessage {
  return msg({
    type: 'assistant-options',
    options: buildActionsForSurface(surface, ctx),
  });
}

describe('chatLifecycle actions (deterministic surfaces)', () => {
  it('A: home surface always includes planificación semanal', () => {
    const home = buildActionsForSurface('home');
    expect(optionsIncludeWeekPlan(home)).toBe(true);
    expect(home.map((o) => o.action)).toEqual([
      'start_cook_now',
      'week_plan',
      'rescue',
    ]);
    expect(surfaceExpectsWeekPlan('home')).toBe(true);
  });

  it('B: completing a meal flow (post_apply_dish) keeps week plan available', () => {
    const afterMeal = buildActionsForSurface('post_apply_dish');
    expect(optionsIncludeWeekPlan(afterMeal)).toBe(true);
    expect(afterMeal.map((o) => o.action)).toContain('go_calendar');
    expect(afterMeal.map((o) => o.action)).toContain('start_cook_now');
  });

  it('C: reset/home and fresh welcome share week plan availability', () => {
    const home = buildActionsForSurface('home');
    const fresh = buildActionsForSurface('home_fresh');
    expect(optionsIncludeWeekPlan(home)).toBe(true);
    expect(optionsIncludeWeekPlan(fresh)).toBe(true);
    expect(buildWelcomeOptions()).toEqual(home);
  });

  it('E: restored transcript without trailing week plan is detected as mismatch', () => {
    const stalePostApply: ChatMessage[] = [
      msg({ type: 'assistant-text', text: 'Listo' }),
      msg({
        type: 'assistant-options',
        options: [
          { id: 'go_calendar', label: 'Ver en calendario', action: 'go_calendar' },
          { id: 'cook_again', label: 'Cocinar otra cosa', action: 'start_cook_now' },
        ],
      }),
    ];

    const surface = deriveSurfaceFromMessages(stalePostApply, true);
    expect(surface).toBe('post_apply_dish');
    expect(trailingOptionsMatchSurface(stalePostApply, 'post_apply_dish')).toBe(false);
    expect(optionsIncludeWeekPlan(buildActionsForSurface('post_apply_dish'))).toBe(true);
  });

  it('F: several consecutive cycles keep the same home action set', () => {
    const cycles = Array.from({ length: 5 }, () => buildActionsForSurface('home'));
    for (const actions of cycles) {
      expect(optionsIncludeWeekPlan(actions)).toBe(true);
      expect(actions).toEqual(cycles[0]);
    }

    const afterDish = buildActionsForSurface('review_dish');
    const afterApply = buildActionsForSurface('post_apply_dish');
    const backHome = buildActionsForSurface('home');
    expect(optionsIncludeWeekPlan(afterDish)).toBe(true);
    expect(optionsIncludeWeekPlan(afterApply)).toBe(true);
    expect(optionsIncludeWeekPlan(backHome)).toBe(true);
  });

  it('derives review_dish / calendar_slot / rescue from transcript', () => {
    expect(
      deriveSurfaceFromMessages([msg({ type: 'assistant-dish' })], true),
    ).toBe('review_dish');

    expect(
      deriveSurfaceFromMessages(
        [opts('calendar_slot', { mealType: 'snack' })],
        true,
      ),
    ).toBe('calendar_slot');

    expect(deriveSurfaceFromMessages([opts('rescue')], true)).toBe('rescue');
    expect(deriveSurfaceFromMessages([], false)).toBe('no_profile');
    expect(deriveSurfaceFromMessages([], true)).toBe('home');
  });

  it('assistant-applied always maps to post_apply_plan (only created by week-plan apply)', () => {
    expect(
      deriveSurfaceFromMessages([msg({ type: 'assistant-applied' })], true),
    ).toBe('post_apply_plan');

    // Dish apply never emits assistant-applied — only text + options.
    const dishApply = [
      msg({ type: 'assistant-text', text: 'Listo, agregué X' }),
      opts('post_apply_dish'),
    ];
    expect(deriveSurfaceFromMessages(dishApply, true)).toBe('post_apply_dish');
  });

  it('distinguishes home vs home_fresh vs post_apply_dish without redundant ternary', () => {
    expect(deriveSurfaceFromMessages([opts('home')], true)).toBe('home');

    // home_fresh chips omit rescue (time-dependent builder may fall back to home;
    // assert the explicit fresh shape used in onboarding).
    const freshOnly = msg({
      type: 'assistant-options',
      options: [
        { id: 'cook_now_meal', label: 'Armá mi Almuerzo', action: 'start_cook_now', icon: 'UtensilsCrossed' },
        { id: 'week_plan', label: 'Planificá mi semana', action: 'week_plan', icon: 'CalendarDays' },
      ],
    });
    expect(deriveSurfaceFromMessages([freshOnly], true)).toBe('home_fresh');

    expect(deriveSurfaceFromMessages([opts('post_apply_dish')], true)).toBe('post_apply_dish');
    expect(deriveSurfaceFromMessages([opts('post_apply_plan')], true)).toBe('post_apply_plan');
  });

  it('D: leaving calendar overlay back to home promotes calendar_slot → home with week plan', () => {
    const fromCalendar = deriveSurfaceFromMessages(
      [opts('calendar_slot', { mealType: 'snack' })],
      true,
    );
    expect(fromCalendar).toBe('calendar_slot');
    const onHomeTab = resolveSurfaceForEngineMode(fromCalendar, 'home');
    expect(onHomeTab).toBe('home');
    expect(optionsIncludeWeekPlan(buildActionsForSurface(onHomeTab))).toBe(true);
    expect(resolveSurfaceForEngineMode(fromCalendar, 'calendar_overlay')).toBe('calendar_slot');
  });

  it('trailing options must be at the end — buried options do not count', () => {
    const buriedThenDish: ChatMessage[] = [
      opts('home'),
      msg({ type: 'user-choice', text: 'No sé qué cocinar ahora' }),
      msg({ type: 'assistant-dish', text: 'Pollo' }),
    ];

    expect(getTrailingOptions(buriedThenDish)).toBeNull();
    expect(deriveSurfaceFromMessages(buriedThenDish, true)).toBe('review_dish');
    // review_dish expects welcome options, but they are NOT trailing → mismatch
    expect(trailingOptionsMatchSurface(buriedThenDish, 'review_dish')).toBe(false);
    expect(shouldAppendSurfaceOptions(buriedThenDish, 'review_dish')).toBe(true);

    const dishThenOptions: ChatMessage[] = [
      ...buriedThenDish,
      opts('review_dish'),
    ];
    expect(getTrailingOptions(dishThenOptions)).not.toBeNull();
    expect(trailingOptionsMatchSurface(dishThenOptions, 'review_dish')).toBe(true);
    expect(shouldAppendSurfaceOptions(dishThenOptions, 'review_dish')).toBe(false);
  });

  it('trailingOptionsMatchSurface ignores loading but not later content', () => {
    const withLoading: ChatMessage[] = [
      opts('home'),
      msg({ type: 'assistant-loading', loadingStyle: 'cooking' }),
    ];
    expect(trailingOptionsMatchSurface(withLoading, 'home')).toBe(true);

    const optionsThenText: ChatMessage[] = [
      opts('home'),
      msg({ type: 'assistant-text', text: 'Seguimos' }),
    ];
    expect(trailingOptionsMatchSurface(optionsThenText, 'home')).toBe(false);
  });
});

describe('planChatLifecycle wiring (engine reconcile)', () => {
  it('reset / empty → seed home with week_plan surface', () => {
    const plan = planChatLifecycle({
      hasHydrated: true,
      hasCalendarIntent: false,
      hasProfile: true,
      messages: [],
      engineMode: 'home',
      lastMealType: null,
      alreadyReconciledThisEpoch: false,
    });
    expect(plan).toEqual({ action: 'seed', surface: 'home' });
    expect(optionsIncludeWeekPlan(buildActionsForSurface('home'))).toBe(true);
  });

  it('nueva conversación (empty + hydrated) → same seed as reset', () => {
    const afterNew = planChatLifecycle({
      hasHydrated: true,
      hasCalendarIntent: false,
      hasProfile: true,
      messages: [],
      engineMode: 'home',
      lastMealType: 'cena',
      alreadyReconciledThisEpoch: false,
    });
    expect(afterNew.action).toBe('seed');
    if (afterNew.action === 'seed') expect(afterNew.surface).toBe('home');
  });

  it('calendar overlay → home mode promotes and rebuilds week_plan actions', () => {
    const messages = [opts('calendar_slot', { mealType: 'snack' })];
    const plan = planChatLifecycle({
      hasHydrated: true,
      hasCalendarIntent: false,
      hasProfile: true,
      messages,
      engineMode: 'home',
      lastMealType: 'snack',
      alreadyReconciledThisEpoch: false,
    });
    expect(plan.action).toBe('reconcile');
    if (plan.action !== 'reconcile') return;
    expect(plan.surface).toBe('home');
    expect(plan.clearMealContext).toBe(true);
    expect(plan.appendOptions).toBe(true);
    expect(optionsIncludeWeekPlan(buildActionsForSurface(plan.surface))).toBe(true);
  });

  it('restore stale post-apply without week_plan → append corrected options', () => {
    const messages: ChatMessage[] = [
      msg({ type: 'assistant-text', text: 'Listo' }),
      msg({
        type: 'assistant-options',
        options: [
          { id: 'go_calendar', label: 'Ver en calendario', action: 'go_calendar' },
          { id: 'cook_again', label: 'Cocinar otra cosa', action: 'start_cook_now' },
        ],
      }),
    ];
    const plan = planChatLifecycle({
      hasHydrated: true,
      hasCalendarIntent: false,
      hasProfile: true,
      messages,
      engineMode: 'home',
      lastMealType: null,
      alreadyReconciledThisEpoch: false,
    });
    expect(plan.action).toBe('reconcile');
    if (plan.action !== 'reconcile') return;
    expect(plan.surface).toBe('post_apply_dish');
    expect(plan.appendOptions).toBe(true);
  });

  it('restore: options then later dish → do not reuse buried options', () => {
    const messages: ChatMessage[] = [
      opts('home'),
      msg({ type: 'user-choice', text: 'Generame una merienda' }),
      msg({ type: 'assistant-dish', text: 'Yogur con frutas' }),
    ];
    const plan = planChatLifecycle({
      hasHydrated: true,
      hasCalendarIntent: false,
      hasProfile: true,
      messages,
      engineMode: 'home',
      lastMealType: 'snack',
      alreadyReconciledThisEpoch: false,
    });
    expect(plan.action).toBe('reconcile');
    if (plan.action !== 'reconcile') return;
    expect(plan.surface).toBe('review_dish');
    expect(plan.appendOptions).toBe(true);
  });

  it('does not append when trailing options already match', () => {
    const messages = [
      msg({ type: 'assistant-dish', text: 'Pollo' }),
      opts('review_dish'),
    ];
    const plan = planChatLifecycle({
      hasHydrated: true,
      hasCalendarIntent: false,
      hasProfile: true,
      messages,
      engineMode: 'home',
      lastMealType: 'almuerzo',
      alreadyReconciledThisEpoch: false,
    });
    expect(plan.action).toBe('reconcile');
    if (plan.action !== 'reconcile') return;
    expect(plan.appendOptions).toBe(false);
  });

  it('skips reconcile when already done this epoch; skips when calendar intent pending', () => {
    expect(
      planChatLifecycle({
        hasHydrated: true,
        hasCalendarIntent: false,
        hasProfile: true,
        messages: [opts('home')],
        engineMode: 'home',
        lastMealType: null,
        alreadyReconciledThisEpoch: true,
      }).action,
    ).toBe('none');

    expect(
      planChatLifecycle({
        hasHydrated: true,
        hasCalendarIntent: true,
        hasProfile: true,
        messages: [],
        engineMode: 'home',
        lastMealType: null,
        alreadyReconciledThisEpoch: false,
      }).action,
    ).toBe('none');
  });

  it('shouldAppendSurfaceOptions prevents consecutive duplicate rows', () => {
    const once = [opts('home')];
    expect(shouldAppendSurfaceOptions(once, 'home')).toBe(false);
    expect(shouldAppendSurfaceOptions([...once, msg({ type: 'assistant-text', text: 'ok' })], 'home')).toBe(true);
  });
});
