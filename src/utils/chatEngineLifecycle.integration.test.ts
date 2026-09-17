import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../types';
import { useChatStore } from '../store/useChatStore';
import {
  buildActionsForSurface,
  optionsIncludeWeekPlan,
  planChatLifecycle,
  shouldAppendSurfaceOptions,
} from './chatLifecycle';

/**
 * Integration-style tests: store mutations + planChatLifecycle (the pure
 * core of the useChatEngine mount effect) without mounting React.
 */

vi.mock('../services/apiService', () => ({
  saveChatConversation: vi.fn(async () => ({ conversationId: 'conv-saved' })),
  createChatConversation: vi.fn(async () => ({
    conversation: { id: 'conv-new', title: null, updatedAt: new Date().toISOString() },
  })),
  loadChatMessagesPage: vi.fn(async (conversationId: string) => ({
    conversationId,
    messages: [
      {
        id: 'old-1',
        type: 'assistant-text',
        text: 'Restaurado',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'old-2',
        type: 'assistant-dish',
        text: 'Tostadas',
        timestamp: new Date().toISOString(),
      },
    ] satisfies ChatMessage[],
    lastWeekPlan: null,
    lastMealType: 'desayuno',
    hasMoreOlder: false,
    olderCursor: null,
  })),
  listChatConversations: vi.fn(async () => ({
    conversations: [],
    hasMore: false,
    nextOffset: 0,
  })),
}));

function applyLifecyclePlan(alreadyReconciledThisEpoch: boolean, engineMode: 'home' | 'calendar_overlay' = 'home') {
  const chat = useChatStore.getState();
  const plan = planChatLifecycle({
    hasHydrated: chat.hasHydrated,
    hasCalendarIntent: Boolean(chat.calendarMealIntent),
    hasProfile: true,
    messages: chat.messages,
    engineMode,
    lastMealType: chat.lastMealType,
    alreadyReconciledThisEpoch,
  });

  if (plan.action === 'seed') {
    chat.setActiveSurface(plan.surface);
    chat.replaceMessages(
      [
        {
          id: 'welcome-text',
          type: 'assistant-text',
          text: '¡Hola!',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'welcome-opts',
          type: 'assistant-options',
          options: buildActionsForSurface(plan.surface === 'no_profile' ? 'no_profile' : 'home'),
          timestamp: new Date().toISOString(),
        },
      ],
      'initial',
    );
    return plan;
  }

  if (plan.action === 'reconcile') {
    chat.setActiveSurface(plan.surface);
    if (plan.clearMealContext) {
      chat.setLastMealType(null);
      chat.setLastMealDate(null);
      chat.clearPendingAction();
    }
    if (plan.appendOptions) {
      chat.appendMessages({
        id: `reconcile-${plan.surface}`,
        type: 'assistant-options',
        options: buildActionsForSurface(plan.surface, plan.optionsCtx),
        timestamp: new Date().toISOString(),
      });
    }
  }

  return plan;
}

function lastOptions(): ChatMessage | undefined {
  return [...useChatStore.getState().messages].reverse().find((m) => m.type === 'assistant-options');
}

describe('chat engine lifecycle wiring (store + planChatLifecycle)', () => {
  beforeEach(() => {
    const memory = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => { memory.set(k, v); },
      removeItem: (k: string) => { memory.delete(k); },
      clear: () => { memory.clear(); },
      key: () => null,
      length: 0,
    });

    useChatStore.setState({
      conversationId: null,
      messages: [],
      conversationHistory: [],
      lastWeekPlan: null,
      lastMealType: null,
      lastMealDate: null,
      calendarMealIntent: null,
      activeSurface: 'home',
      conversationEpoch: 0,
      hasMoreOlder: false,
      olderCursor: null,
      isLoadingOlder: false,
      conversationSummaries: [],
      hasMoreConversations: false,
      conversationsNextOffset: 0,
      isLoadingConversations: false,
      isLoading: false,
      pendingAction: null,
      scrollIntent: 'none',
      hasHydrated: true,
    });
  });

  it('reset → welcome + week_plan', () => {
    useChatStore.getState().appendMessages({
      id: 'noise',
      type: 'assistant-options',
      options: buildActionsForSurface('calendar_slot', { mealType: 'snack' }),
      timestamp: new Date().toISOString(),
    });
    useChatStore.getState().resetConversation({ sync: false });

    const plan = applyLifecyclePlan(false);
    expect(plan.action).toBe('seed');
    expect(optionsIncludeWeekPlan(lastOptions()?.options ?? [])).toBe(true);
    expect(useChatStore.getState().activeSurface).toBe('home');
  });

  it('nueva conversación → welcome + week_plan', async () => {
    await useChatStore.getState().startNewConversation();
    const plan = applyLifecyclePlan(false);
    expect(plan.action).toBe('seed');
    expect(useChatStore.getState().conversationId).toBe('conv-new');
    expect(optionsIncludeWeekPlan(lastOptions()?.options ?? [])).toBe(true);
  });

  it('calendar overlay → volver a Inicio → acciones home', () => {
    useChatStore.getState().appendMessages({
      id: 'slot',
      type: 'assistant-options',
      options: buildActionsForSurface('calendar_slot', { mealType: 'snack' }),
      timestamp: new Date().toISOString(),
    });
    useChatStore.getState().setLastMealType('snack');
    useChatStore.getState().setActiveSurface('calendar_slot');

    const plan = applyLifecyclePlan(false, 'home');
    expect(plan.action).toBe('reconcile');
    expect(useChatStore.getState().activeSurface).toBe('home');
    expect(useChatStore.getState().lastMealType).toBeNull();
    expect(optionsIncludeWeekPlan(lastOptions()?.options ?? [])).toBe(true);
  });

  it('restaurar transcript viejo sin week_plan → se reconstruye', () => {
    useChatStore.getState().hydrate({
      conversationId: 'legacy',
      messages: [
        {
          id: 't',
          type: 'assistant-text',
          text: 'Listo',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'o',
          type: 'assistant-options',
          options: [
            { id: 'go_calendar', label: 'Ver en calendario', action: 'go_calendar' },
            { id: 'cook_again', label: 'Cocinar otra cosa', action: 'start_cook_now' },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
      lastWeekPlan: null,
      lastMealType: null,
    });

    const plan = applyLifecyclePlan(false);
    expect(plan.action).toBe('reconcile');
    if (plan.action === 'reconcile') expect(plan.appendOptions).toBe(true);
    expect(optionsIncludeWeekPlan(lastOptions()?.options ?? [])).toBe(true);
  });

  it('options viejos + transición posterior → no reutilizar esos options', async () => {
    await useChatStore.getState().openConversation('conv-restored');
    // Fixture ends with assistant-dish after no trailing options.
    const before = useChatStore.getState().messages.length;
    const plan = applyLifecyclePlan(false);
    expect(plan.action).toBe('reconcile');
    if (plan.action === 'reconcile') {
      expect(plan.surface).toBe('review_dish');
      expect(plan.appendOptions).toBe(true);
    }
    expect(useChatStore.getState().messages.length).toBe(before + 1);
    expect(optionsIncludeWeekPlan(lastOptions()?.options ?? [])).toBe(true);
  });

  it('reset durante request async → respuesta anterior no reaparece', async () => {
    const epoch = useChatStore.getState().tryBeginSend();
    expect(epoch).not.toBeNull();

    useChatStore.getState().appendMessages({
      id: 'loading',
      type: 'assistant-loading',
      timestamp: new Date().toISOString(),
    });

    useChatStore.getState().resetConversation({ sync: false });
    expect(useChatStore.getState().isEpochCurrent(epoch!)).toBe(false);

    // Late response guarded by epoch — must not land.
    if (useChatStore.getState().isEpochCurrent(epoch!)) {
      useChatStore.getState().appendMessages({
        id: 'stale-dish',
        type: 'assistant-dish',
        text: 'Plato viejo',
        timestamp: new Date().toISOString(),
      });
    }

    applyLifecyclePlan(false);
    expect(useChatStore.getState().messages.some((m) => m.id === 'stale-dish')).toBe(false);
    expect(optionsIncludeWeekPlan(lastOptions()?.options ?? [])).toBe(true);
  });

  it('enterSurface-equivalent does not duplicate consecutive option rows', () => {
    applyLifecyclePlan(false); // seed home
    const messages = useChatStore.getState().messages;
    expect(shouldAppendSurfaceOptions(messages, 'home')).toBe(false);

    // Simulate calling enterSurface('home') again — must not append.
    if (shouldAppendSurfaceOptions(useChatStore.getState().messages, 'home')) {
      useChatStore.getState().appendMessages({
        id: 'dup',
        type: 'assistant-options',
        options: buildActionsForSurface('home'),
        timestamp: new Date().toISOString(),
      });
    }

    const optionRows = useChatStore.getState().messages.filter((m) => m.type === 'assistant-options');
    expect(optionRows).toHaveLength(1);
  });
});
