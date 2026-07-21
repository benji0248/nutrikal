import { create } from 'zustand';
import type { ChatMessage, MealType, WeekPlan } from '../types';
import * as api from '../services/apiService';

/** Max user+assistant pairs kept for the LLM context (not the UI transcript). */
export const AI_CONVERSATION_HISTORY_LIMIT = 10;

export type ChatScrollIntent = 'none' | 'initial' | 'append' | 'prepend';

export type ChatConversationTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatPendingAction =
  | { kind: 'dish' }
  | { kind: 'regenerate'; messageId: string; previousDishName?: string }
  | { kind: 'swap'; date: string; mealType: MealType; previousDishName?: string };

export type ChatConversationSnapshot = {
  conversationId: string | null;
  messages: ChatMessage[];
  lastWeekPlan: WeekPlan | null;
  lastMealType: MealType | null;
};

interface ChatState {
  conversationId: string | null;
  /** Visual transcript — session source of truth. */
  messages: ChatMessage[];
  /** Derived, truncated LLM context — never the full transcript. */
  conversationHistory: ChatConversationTurn[];
  lastWeekPlan: WeekPlan | null;
  lastMealType: MealType | null;

  /** In-flight request gate (also prevents double-send after remount). */
  isLoading: boolean;
  /** Context for the request currently in flight — session only, never DB. */
  pendingAction: ChatPendingAction | null;

  /** Scroll driver for ChatAssistant — consumed and cleared by the UI. */
  scrollIntent: ChatScrollIntent;

  /** True after batch-load hydrate attempt (even if empty). */
  hasHydrated: boolean;

  appendMessages: (...msgs: ChatMessage[]) => void;
  removeMessage: (id: string) => void;
  replaceMessages: (messages: ChatMessage[], intent?: ChatScrollIntent) => void;
  updateMessages: (
    updater: (prev: ChatMessage[]) => ChatMessage[],
    intent?: ChatScrollIntent,
  ) => void;

  appendConversationTurn: (userContent: string, assistantContent: string) => void;
  clearConversationHistory: () => void;

  setLastWeekPlan: (plan: WeekPlan | null) => void;
  setLastMealType: (mealType: MealType | null) => void;

  /** @returns false if a send is already in progress */
  tryBeginSend: () => boolean;
  endSend: () => void;

  setPendingAction: (action: ChatPendingAction | null) => void;
  clearPendingAction: () => void;

  clearScrollIntent: () => void;

  /** Restore from server — does not write back. */
  hydrate: (snapshot: ChatConversationSnapshot | null | undefined) => void;

  /** Wipe session conversation (logout / new welcome). */
  resetConversation: (options?: { sync?: boolean }) => void;
}

const initialConversation = {
  conversationId: null as string | null,
  messages: [] as ChatMessage[],
  conversationHistory: [] as ChatConversationTurn[],
  lastWeekPlan: null as WeekPlan | null,
  lastMealType: null as MealType | null,
  isLoading: false,
  pendingAction: null as ChatPendingAction | null,
  scrollIntent: 'none' as ChatScrollIntent,
  hasHydrated: false,
};

function isPersistable(message: ChatMessage): boolean {
  return message.type !== 'assistant-loading';
}

/** Rebuild truncated LLM context from UI transcript (never the full list). */
export function rebuildConversationHistory(messages: ChatMessage[]): ChatConversationTurn[] {
  const turns: ChatConversationTurn[] = [];
  for (const m of messages) {
    if (m.type === 'user-text' || m.type === 'user-choice') {
      const text = m.text?.trim();
      if (text) turns.push({ role: 'user', content: text });
      continue;
    }
    if (m.type === 'assistant-text') {
      const text = m.text?.trim();
      if (text) turns.push({ role: 'assistant', content: text });
      continue;
    }
    if (m.type === 'assistant-dish') {
      const text = (m.text?.trim() || m.dishSuggestion?.name || '').trim();
      if (text) turns.push({ role: 'assistant', content: text });
    }
  }
  const maxEntries = AI_CONVERSATION_HISTORY_LIMIT * 2;
  return turns.length > maxEntries ? turns.slice(-maxEntries) : turns;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncSuspended = false;

function scheduleSync(): void {
  if (syncSuspended) return;
  if (!localStorage.getItem('nutrikal-jwt')) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void flushSync();
  }, 450);
}

async function flushSync(): Promise<void> {
  if (!localStorage.getItem('nutrikal-jwt')) return;
  const state = useChatStore.getState();
  const payload: ChatConversationSnapshot = {
    conversationId: state.conversationId,
    messages: state.messages.filter(isPersistable),
    lastWeekPlan: state.lastWeekPlan,
    lastMealType: state.lastMealType,
  };
  try {
    const result = await api.saveChatConversation(payload);
    if (result.conversationId && useChatStore.getState().conversationId !== result.conversationId) {
      useChatStore.setState({ conversationId: result.conversationId });
    }
  } catch (e) {
    console.error('Chat conversation save error:', e);
  }
}

export const useChatStore = create<ChatState>()((set, get) => ({
  ...initialConversation,

  appendMessages: (...msgs) => {
    if (msgs.length === 0) return;
    set((s) => ({
      messages: [...s.messages, ...msgs],
      scrollIntent: 'append',
    }));
    if (msgs.some(isPersistable)) scheduleSync();
  },

  removeMessage: (id) => {
    set((s) => ({
      messages: s.messages.filter((m) => m.id !== id),
    }));
    scheduleSync();
  },

  replaceMessages: (messages, intent = 'initial') => {
    set({ messages, scrollIntent: intent });
    scheduleSync();
  },

  updateMessages: (updater, intent = 'none') => {
    set((s) => ({
      messages: updater(s.messages),
      scrollIntent: intent === 'none' ? s.scrollIntent : intent,
    }));
    scheduleSync();
  },

  appendConversationTurn: (userContent, assistantContent) => {
    set((s) => {
      let history: ChatConversationTurn[] = [
        ...s.conversationHistory,
        { role: 'user', content: userContent },
        { role: 'assistant', content: assistantContent },
      ];
      const maxEntries = AI_CONVERSATION_HISTORY_LIMIT * 2;
      if (history.length > maxEntries) {
        history = history.slice(-maxEntries);
      }
      return { conversationHistory: history };
    });
    // History is derived for LLM; messages already schedule sync when appended.
  },

  clearConversationHistory: () => set({ conversationHistory: [] }),

  setLastWeekPlan: (plan) => {
    set({ lastWeekPlan: plan });
    scheduleSync();
  },

  setLastMealType: (mealType) => {
    set({ lastMealType: mealType });
    scheduleSync();
  },

  tryBeginSend: () => {
    if (get().isLoading) return false;
    set({ isLoading: true });
    return true;
  },

  endSend: () => set({ isLoading: false }),

  setPendingAction: (action) => set({ pendingAction: action }),
  clearPendingAction: () => set({ pendingAction: null }),

  clearScrollIntent: () => set({ scrollIntent: 'none' }),

  hydrate: (snapshot) => {
    syncSuspended = true;
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }

    const messages = (snapshot?.messages ?? []).filter(isPersistable);
    set({
      conversationId: snapshot?.conversationId ?? null,
      messages,
      conversationHistory: rebuildConversationHistory(messages),
      lastWeekPlan: snapshot?.lastWeekPlan ?? null,
      lastMealType: snapshot?.lastMealType ?? null,
      isLoading: false,
      pendingAction: null,
      scrollIntent: messages.length > 0 ? 'initial' : 'none',
      hasHydrated: true,
    });

    syncSuspended = false;
  },

  resetConversation: (options) => {
    const shouldSync = options?.sync !== false;
    syncSuspended = true;
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    set({ ...initialConversation, hasHydrated: get().hasHydrated });
    syncSuspended = false;
    if (shouldSync) scheduleSync();
  },
}));
