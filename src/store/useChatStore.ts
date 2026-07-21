import { create } from 'zustand';
import type { ChatMessage, MealType, WeekPlan } from '../types';
import * as api from '../services/apiService';
import type { ChatConversationSummary } from '../services/apiService';

/** Max user+assistant pairs kept for the LLM context (not the UI transcript). */
export const AI_CONVERSATION_HISTORY_LIMIT = 10;

export const CHAT_MESSAGES_PAGE_SIZE = 30;

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
  hasMoreOlder?: boolean;
  olderCursor?: string | null;
};

interface ChatState {
  conversationId: string | null;
  messages: ChatMessage[];
  conversationHistory: ChatConversationTurn[];
  lastWeekPlan: WeekPlan | null;
  lastMealType: MealType | null;

  hasMoreOlder: boolean;
  olderCursor: string | null;
  isLoadingOlder: boolean;

  conversationSummaries: ChatConversationSummary[];
  hasMoreConversations: boolean;
  conversationsNextOffset: number;
  isLoadingConversations: boolean;

  isLoading: boolean;
  pendingAction: ChatPendingAction | null;
  scrollIntent: ChatScrollIntent;
  hasHydrated: boolean;

  appendMessages: (...msgs: ChatMessage[]) => void;
  prependMessages: (...msgs: ChatMessage[]) => void;
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

  tryBeginSend: () => boolean;
  endSend: () => void;

  setPendingAction: (action: ChatPendingAction | null) => void;
  clearPendingAction: () => void;
  clearScrollIntent: () => void;

  hydrate: (snapshot: ChatConversationSnapshot | null | undefined) => void;
  loadOlderMessages: () => Promise<void>;

  loadConversationList: (reset?: boolean) => Promise<void>;
  openConversation: (conversationId: string) => Promise<void>;
  startNewConversation: () => Promise<void>;

  resetConversation: (options?: { sync?: boolean }) => void;
}

const initialConversation = {
  conversationId: null as string | null,
  messages: [] as ChatMessage[],
  conversationHistory: [] as ChatConversationTurn[],
  lastWeekPlan: null as WeekPlan | null,
  lastMealType: null as MealType | null,
  hasMoreOlder: false,
  olderCursor: null as string | null,
  isLoadingOlder: false,
  conversationSummaries: [] as ChatConversationSummary[],
  hasMoreConversations: false,
  conversationsNextOffset: 0,
  isLoadingConversations: false,
  isLoading: false,
  pendingAction: null as ChatPendingAction | null,
  scrollIntent: 'none' as ChatScrollIntent,
  hasHydrated: false,
};

function isPersistable(message: ChatMessage): boolean {
  return message.type !== 'assistant-loading';
}

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
  const payload: api.ChatConversationPayload = {
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

function applyConversationPage(
  snapshot: ChatConversationSnapshot,
  scrollIntent: ChatScrollIntent = 'initial',
): Partial<ChatState> {
  const messages = (snapshot.messages ?? []).filter(isPersistable);
  return {
    conversationId: snapshot.conversationId ?? null,
    messages,
    conversationHistory: rebuildConversationHistory(messages),
    lastWeekPlan: snapshot.lastWeekPlan ?? null,
    lastMealType: snapshot.lastMealType ?? null,
    hasMoreOlder: snapshot.hasMoreOlder ?? false,
    olderCursor: snapshot.olderCursor ?? null,
    isLoading: false,
    pendingAction: null,
    scrollIntent,
    hasHydrated: true,
  };
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

  prependMessages: (...msgs) => {
    const filtered = msgs.filter(isPersistable);
    if (filtered.length === 0) return;
    set((s) => ({
      messages: [...filtered, ...s.messages],
      scrollIntent: 'prepend',
    }));
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
    set(applyConversationPage(snapshot ?? {
      conversationId: null,
      messages: [],
      lastWeekPlan: null,
      lastMealType: null,
      hasMoreOlder: false,
      olderCursor: null,
    }));
    syncSuspended = false;
  },

  loadOlderMessages: async () => {
    const state = get();
    if (
      state.isLoadingOlder ||
      !state.hasMoreOlder ||
      !state.conversationId ||
      !state.olderCursor
    ) {
      return;
    }

    set({ isLoadingOlder: true });
    try {
      const page = await api.loadChatMessagesPage(state.conversationId, {
        before: state.olderCursor,
        limit: CHAT_MESSAGES_PAGE_SIZE,
      });
      get().prependMessages(...(page.messages as ChatMessage[]));
      set({
        hasMoreOlder: page.hasMoreOlder,
        olderCursor: page.olderCursor,
        isLoadingOlder: false,
      });
    } catch (e) {
      console.error('loadOlderMessages error:', e);
      set({ isLoadingOlder: false });
    }
  },

  loadConversationList: async (reset = false) => {
    const state = get();
    if (state.isLoadingConversations) return;
    const offset = reset ? 0 : state.conversationsNextOffset;
    if (!reset && !state.hasMoreConversations && state.conversationSummaries.length > 0) {
      return;
    }

    set({ isLoadingConversations: true });
    try {
      const result = await api.listChatConversations(offset);
      set({
        conversationSummaries: reset
          ? result.conversations
          : [...state.conversationSummaries, ...result.conversations],
        hasMoreConversations: result.hasMore,
        conversationsNextOffset: result.nextOffset ?? offset + result.conversations.length,
        isLoadingConversations: false,
      });
    } catch (e) {
      console.error('loadConversationList error:', e);
      set({ isLoadingConversations: false });
    }
  },

  openConversation: async (conversationId) => {
    syncSuspended = true;
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    set({ isLoadingOlder: true });
    try {
      const page = await api.loadChatMessagesPage(conversationId);
      set({
        ...applyConversationPage({
          conversationId: page.conversationId,
          messages: page.messages as ChatMessage[],
          lastWeekPlan: page.lastWeekPlan,
          lastMealType: page.lastMealType,
          hasMoreOlder: page.hasMoreOlder,
          olderCursor: page.olderCursor,
        }),
        isLoadingOlder: false,
      });
    } catch (e) {
      console.error('openConversation error:', e);
      set({ isLoadingOlder: false });
    } finally {
      syncSuspended = false;
    }
  },

  startNewConversation: async () => {
    syncSuspended = true;
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    try {
      const { conversation } = await api.createChatConversation();
      set({
        ...initialConversation,
        conversationId: conversation.id,
        hasHydrated: true,
        scrollIntent: 'initial',
      });
    } catch (e) {
      console.error('startNewConversation error:', e);
      set({
        ...initialConversation,
        hasHydrated: get().hasHydrated,
        scrollIntent: 'initial',
      });
    } finally {
      syncSuspended = false;
    }
  },

  resetConversation: (options) => {
    const shouldSync = options?.sync !== false;
    syncSuspended = true;
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    set({
      ...initialConversation,
      hasHydrated: get().hasHydrated,
    });
    syncSuspended = false;
    if (shouldSync) scheduleSync();
  },
}));
