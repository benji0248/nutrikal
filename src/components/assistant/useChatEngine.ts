import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, ChatOption, EnergyLevel, MealType, WeekPlan } from '../../types';
import { useProfileStore } from '../../store/useProfileStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { sendMessage, type SendMessageResult } from '../../services/aiService';
import { hydrateAiDish } from '../../services/dishMatchService';

export const AI_CONVERSATION_HISTORY_LIMIT = 10;

function makeId(): string {
  return crypto.randomUUID();
}

interface ChatEngineResult {
  messages: ChatMessage[];
  hasProfile: boolean;
  handleOption: (option: ChatOption) => void;
  handleSendMessage: (text: string) => void;
  handleApplyPlan: (plan: WeekPlan) => void;
  handleRegeneratePlan: () => void;
  handleSwapMeal: (date: string, mealType: MealType) => void;
  energyLevel: EnergyLevel;
  energyRatio: number;
  showCalories: boolean;
  isLoading: boolean;
  remainingMessages: number | null;
}

export function useChatEngine(): ChatEngineResult {
  const profile = useProfileStore((s) => s.profile);
  const aiModel = useSettingsStore((s) => s.aiModel);

  const [messages, setMessages] = useState<ChatMessage[]>(() => buildWelcomeMessages());
  const [isLoading, setIsLoading] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);

  const conversationRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const lastUserPromptRef = useRef<string | null>(null);
  const prevProfileRef = useRef(profile);
  const sendingLockRef = useRef(false);

  useEffect(() => {
    if (!prevProfileRef.current && profile) {
      setMessages(buildWelcomeMessages());
      conversationRef.current = [];
    }
    prevProfileRef.current = profile;
  }, [profile]);

  function buildWelcomeMessages(): ChatMessage[] {
    if (!profile) {
      return [
        {
          id: makeId(),
          type: 'assistant-text',
          text: '¡Bienvenido a NutriKal! Creá tu perfil para empezar.',
          timestamp: new Date().toISOString(),
        },
        {
          id: makeId(),
          type: 'assistant-options',
          options: [
            { id: 'create_profile', label: 'Crear perfil', action: 'create_profile', icon: 'UserCircle' },
          ],
          timestamp: new Date().toISOString(),
        },
      ];
    }

    return [
      {
        id: makeId(),
        type: 'assistant-text',
        text: `¡Hola${profile.name ? `, ${profile.name}` : ''}! Soy tu asistente. ¿En qué te ayudo?`,
        timestamp: new Date().toISOString(),
      },
    ];
  }

  function addMessages(...msgs: ChatMessage[]) {
    setMessages((prev) => [...prev, ...msgs]);
  }

  async function sendToAi(text: string, options?: { variation?: boolean }) {
    if (!profile) return;
    if (sendingLockRef.current) return;
    sendingLockRef.current = true;

    const promptForApi = options?.variation
      ? `${text.trim()}\n\n[Generá otro plato completamente distinto: distinto nombre, técnica y presentación. No repitas platos de esta conversación.]`
      : text.trim();

    if (!options?.variation) {
      lastUserPromptRef.current = text.trim();
    }

    setIsLoading(true);
    const loadingId = makeId();
    addMessages({
      id: loadingId,
      type: 'assistant-loading',
      timestamp: new Date().toISOString(),
    });

    try {
      const result: SendMessageResult = await sendMessage(
        promptForApi,
        conversationRef.current,
        aiModel,
      );

      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      setRemainingMessages(result.remaining);

      conversationRef.current.push(
        { role: 'user', content: promptForApi },
        { role: 'assistant', content: result.text },
      );
      if (conversationRef.current.length > AI_CONVERSATION_HISTORY_LIMIT * 2) {
        conversationRef.current = conversationRef.current.slice(-AI_CONVERSATION_HISTORY_LIMIT * 2);
      }

      if (result.dish) {
        const hydrated = hydrateAiDish(result.dish);
        addMessages({
          id: makeId(),
          type: 'assistant-dish',
          text: hydrated.name,
          dishSuggestion: hydrated,
          timestamp: new Date().toISOString(),
        });
      } else {
        const displayText = result.text.trim()
          || 'No recibí una respuesta del asistente. ¿Podés intentar de nuevo?';

        addMessages({
          id: makeId(),
          type: 'assistant-text',
          text: displayText,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));

      const fallback =
        err instanceof Error && err.message === 'Not authenticated'
          ? 'Necesitás estar conectado para usar el asistente.'
          : err instanceof Error && err.message.trim()
            ? err.message
            : 'Algo salió mal. ¿Podés intentar de nuevo?';

      addMessages({
        id: makeId(),
        type: 'assistant-text',
        text: fallback,
        timestamp: new Date().toISOString(),
      });
    } finally {
      sendingLockRef.current = false;
      setIsLoading(false);
    }
  }

  const handleSendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return;
      addMessages({
        id: makeId(),
        type: 'user-text',
        text: text.trim(),
        timestamp: new Date().toISOString(),
      });
      sendToAi(text.trim());
    },
    [isLoading, profile],
  );

  const handleOption = useCallback(
    (option: ChatOption) => {
      if (isLoading) return;
      if (option.action === 'quick_reply' && option.payload) {
        addMessages({
          id: makeId(),
          type: 'user-choice',
          text: option.payload,
          timestamp: new Date().toISOString(),
        });
        sendToAi(option.payload);
      }
    },
    [isLoading, profile],
  );

  return {
    messages,
    hasProfile: !!profile,
    handleOption,
    handleSendMessage,
    handleApplyPlan: () => {},
    handleRegeneratePlan: () => {
      const last = lastUserPromptRef.current;
      if (!last || isLoading) return;
      sendToAi(last, { variation: true });
    },
    handleSwapMeal: () => {},
    energyLevel: 'green',
    energyRatio: 0.5,
    showCalories: false,
    isLoading,
    remainingMessages,
  };
}
