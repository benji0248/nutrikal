import { create } from 'zustand';
import type { ChatMessage, MealType, WeekPlan } from '../types';

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

interface ChatState {
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

  /** Wipe session conversation (logout / new welcome). */
  resetConversation: () => void;
}

const initialConversation = {
  messages: [] as ChatMessage[],
  conversationHistory: [] as ChatConversationTurn[],
  lastWeekPlan: null as WeekPlan | null,
  lastMealType: null as MealType | null,
  isLoading: false,
  pendingAction: null as ChatPendingAction | null,
  scrollIntent: 'none' as ChatScrollIntent,
};

export const useChatStore = create<ChatState>()((set, get) => ({
  ...initialConversation,

  appendMessages: (...msgs) => {
    if (msgs.length === 0) return;
    set((s) => ({
      messages: [...s.messages, ...msgs],
      scrollIntent: 'append',
    }));
  },

  removeMessage: (id) => {
    set((s) => ({
      messages: s.messages.filter((m) => m.id !== id),
    }));
  },

  replaceMessages: (messages, intent = 'initial') => {
    set({ messages, scrollIntent: intent });
  },

  updateMessages: (updater, intent = 'none') => {
    set((s) => ({
      messages: updater(s.messages),
      scrollIntent: intent === 'none' ? s.scrollIntent : intent,
    }));
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

  setLastWeekPlan: (plan) => set({ lastWeekPlan: plan }),
  setLastMealType: (mealType) => set({ lastMealType: mealType }),

  tryBeginSend: () => {
    if (get().isLoading) return false;
    set({ isLoading: true });
    return true;
  },

  endSend: () => set({ isLoading: false }),

  setPendingAction: (action) => set({ pendingAction: action }),
  clearPendingAction: () => set({ pendingAction: null }),

  clearScrollIntent: () => set({ scrollIntent: 'none' }),

  resetConversation: () => set({ ...initialConversation }),
}));
