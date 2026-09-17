import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../types';
import { useChatStore } from '../store/useChatStore';
import {
  buildActionsForSurface,
  optionsIncludeWeekPlan,
} from './chatLifecycle';

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
        type: 'assistant-options',
        options: [
          { id: 'go_calendar', label: 'Ver en calendario', action: 'go_calendar' },
          { id: 'cook_again', label: 'Cocinar otra cosa', action: 'start_cook_now' },
        ],
        timestamp: new Date().toISOString(),
      },
    ] satisfies ChatMessage[],
    lastWeekPlan: null,
    lastMealType: 'almuerzo',
    hasMoreOlder: false,
    olderCursor: null,
  })),
  listChatConversations: vi.fn(async () => ({
    conversations: [],
    hasMore: false,
    nextOffset: 0,
  })),
}));

function lastOptions(): ChatMessage | undefined {
  const messages = useChatStore.getState().messages;
  return [...messages].reverse().find((m) => m.type === 'assistant-options');
}

describe('chat store lifecycle / epoch', () => {
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

  it('C: resetConversation bumps epoch and clears meal residues', () => {
    const store = useChatStore.getState();
    store.appendMessages({
      id: 'm1',
      type: 'assistant-options',
      options: buildActionsForSurface('calendar_slot', { mealType: 'snack' }),
      timestamp: new Date().toISOString(),
    });
    store.setLastMealType('snack');
    store.setLastMealDate('2026-09-17');
    store.setPendingAction({ kind: 'dish' });
    const epochBefore = useChatStore.getState().conversationEpoch;

    store.resetConversation({ sync: false });

    const after = useChatStore.getState();
    expect(after.conversationEpoch).toBe(epochBefore + 1);
    expect(after.messages).toEqual([]);
    expect(after.lastMealType).toBeNull();
    expect(after.lastMealDate).toBeNull();
    expect(after.pendingAction).toBeNull();
    expect(after.activeSurface).toBe('home');
    expect(after.isLoading).toBe(false);
  });

  it('C: startNewConversation yields same empty home-ready state as reset', async () => {
    useChatStore.getState().setLastMealType('cena');
    useChatStore.getState().appendMessages({
      id: 'x',
      type: 'user-text',
      text: 'hola',
      timestamp: new Date().toISOString(),
    });

    await useChatStore.getState().startNewConversation();
    const a = useChatStore.getState();

    useChatStore.getState().setLastMealType('cena');
    useChatStore.getState().appendMessages({
      id: 'y',
      type: 'user-text',
      text: 'hola',
      timestamp: new Date().toISOString(),
    });
    useChatStore.getState().resetConversation({ sync: false });
    const b = useChatStore.getState();

    expect(a.messages).toEqual([]);
    expect(b.messages).toEqual([]);
    expect(a.lastMealType).toBeNull();
    expect(b.lastMealType).toBeNull();
    expect(a.activeSurface).toBe('home');
    expect(b.activeSurface).toBe('home');
    expect(a.hasHydrated).toBe(true);
    expect(b.hasHydrated).toBe(true);
  });

  it('D: hydrate preserves messages so remount can rebuild from transcript', () => {
    const snapshotMessages: ChatMessage[] = [
      {
        id: 'w1',
        type: 'assistant-text',
        text: 'Hola',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'w2',
        type: 'assistant-options',
        options: buildActionsForSurface('home'),
        timestamp: new Date().toISOString(),
      },
    ];
    useChatStore.getState().hydrate({
      conversationId: 'conv-1',
      messages: snapshotMessages,
      lastWeekPlan: null,
      lastMealType: null,
    });

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.hasHydrated).toBe(true);
    expect(optionsIncludeWeekPlan(lastOptions()?.options ?? [])).toBe(true);
  });

  it('E: openConversation restores transcript and bumps epoch', async () => {
    const epochBefore = useChatStore.getState().conversationEpoch;
    await useChatStore.getState().openConversation('conv-restored');
    const state = useChatStore.getState();
    expect(state.conversationId).toBe('conv-restored');
    expect(state.conversationEpoch).toBe(epochBefore + 1);
    expect(state.lastMealType).toBe('almuerzo');
    expect(state.messages.length).toBeGreaterThan(0);
    // Stale post-apply without week_plan — engine reconcile is responsible for fixing
    // trailing options; store must expose the raw transcript for that rebuild.
    expect(optionsIncludeWeekPlan(lastOptions()?.options ?? [])).toBe(false);
  });

  it('G: stale async response after reset must not apply (epoch guard)', async () => {
    const epoch = useChatStore.getState().tryBeginSend();
    expect(epoch).not.toBeNull();
    expect(useChatStore.getState().isLoading).toBe(true);

    useChatStore.getState().resetConversation({ sync: false });

    expect(useChatStore.getState().isEpochCurrent(epoch!)).toBe(false);
    expect(useChatStore.getState().isLoading).toBe(false);

    // Simulate late response attempting to mutate — callers must check epoch first.
    if (useChatStore.getState().isEpochCurrent(epoch!)) {
      useChatStore.getState().appendMessages({
        id: 'stale',
        type: 'assistant-text',
        text: 'respuesta vieja',
        timestamp: new Date().toISOString(),
      });
    }

    expect(useChatStore.getState().messages).toEqual([]);
  });

  it('G: startNewConversation invalidates in-flight epoch immediately', async () => {
    const epoch = useChatStore.getState().tryBeginSend();
    expect(epoch).not.toBeNull();

    const startPromise = useChatStore.getState().startNewConversation();
    expect(useChatStore.getState().isEpochCurrent(epoch!)).toBe(false);
    expect(useChatStore.getState().messages).toEqual([]);
    await startPromise;
    expect(useChatStore.getState().conversationId).toBe('conv-new');
  });
});
