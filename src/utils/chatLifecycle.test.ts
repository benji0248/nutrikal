import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../types';
import {
  buildActionsForSurface,
  buildWelcomeOptions,
  deriveSurfaceFromMessages,
  optionsIncludeWeekPlan,
  resolveSurfaceForEngineMode,
  surfaceExpectsWeekPlan,
  trailingOptionsMatchSurface,
  type ChatSurface,
} from './chatLifecycle';

function opts(surface: ChatSurface, extras?: Partial<ChatMessage>): ChatMessage {
  return {
    id: `opts-${surface}`,
    type: 'assistant-options',
    options: buildActionsForSurface(surface),
    timestamp: new Date().toISOString(),
    ...extras,
  };
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
      {
        id: '1',
        type: 'assistant-text',
        text: 'Listo',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'assistant-options',
        options: [
          { id: 'go_calendar', label: 'Ver en calendario', action: 'go_calendar' },
          { id: 'cook_again', label: 'Cocinar otra cosa', action: 'start_cook_now' },
        ],
        timestamp: new Date().toISOString(),
      },
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
      deriveSurfaceFromMessages(
        [{ id: 'd', type: 'assistant-dish', timestamp: new Date().toISOString() }],
        true,
      ),
    ).toBe('review_dish');

    expect(
      deriveSurfaceFromMessages(
        [
          {
            id: 'c',
            type: 'assistant-options',
            options: buildActionsForSurface('calendar_slot', { mealType: 'snack' }),
            timestamp: new Date().toISOString(),
          },
        ],
        true,
      ),
    ).toBe('calendar_slot');

    expect(deriveSurfaceFromMessages([opts('rescue')], true)).toBe('rescue');
    expect(deriveSurfaceFromMessages([], false)).toBe('no_profile');
    expect(deriveSurfaceFromMessages([], true)).toBe('home');
  });

  it('D: leaving calendar overlay back to home promotes calendar_slot → home with week plan', () => {
    const fromCalendar = deriveSurfaceFromMessages(
      [
        {
          id: 'c',
          type: 'assistant-options',
          options: buildActionsForSurface('calendar_slot', { mealType: 'snack' }),
          timestamp: new Date().toISOString(),
        },
      ],
      true,
    );
    expect(fromCalendar).toBe('calendar_slot');
    const onHomeTab = resolveSurfaceForEngineMode(fromCalendar, 'home');
    expect(onHomeTab).toBe('home');
    expect(optionsIncludeWeekPlan(buildActionsForSurface(onHomeTab))).toBe(true);
    expect(resolveSurfaceForEngineMode(fromCalendar, 'calendar_overlay')).toBe('calendar_slot');
  });

  it('trailingOptionsMatchSurface is true only for exact rebuilt set', () => {
    const messages = [opts('home')];
    expect(trailingOptionsMatchSurface(messages, 'home')).toBe(true);
    expect(trailingOptionsMatchSurface(messages, 'post_apply_dish')).toBe(false);
  });
});
