import { useRef, useEffect, useState, useCallback } from 'react';
import { History, Plus, Send, UserCircle } from 'lucide-react';
import type { ChatOption, AppTab } from '../../types';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ProfileSetup } from '../profile/ProfileSetup';
import { WeekPlanningSetup } from '../profile/WeekPlanningSetup';
import { useChatEngine } from './useChatEngine';
import { useChatStore } from '../../store/useChatStore';
import { ChatHistoryPanel } from './ChatHistoryPanel';

interface ChatAssistantProps {
  onTabChange?: (tab: AppTab) => void;
}

export const ChatAssistant = ({ onTabChange }: ChatAssistantProps) => {
  const {
    messages,
    hasProfile,
    handleOption,
    handleSendMessage,
    handleApplyDish,
    handleApplyPlan,
    handleRegeneratePlan,
    handleRegenerateDish,
    handleSwapMeal,
    energyLevel,
    energyRatio,
    showCalories,
    isLoading,
    hasWeekPlanningProfile,
    runWeekPlanGeneration,
  } = useChatEngine();

  const scrollIntent = useChatStore((s) => s.scrollIntent);
  const clearScrollIntent = useChatStore((s) => s.clearScrollIntent);
  const hasMoreOlder = useChatStore((s) => s.hasMoreOlder);
  const isLoadingOlder = useChatStore((s) => s.isLoadingOlder);
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages);

  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showWeekPlanningSetup, setShowWeekPlanningSetup] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [inputText, setInputText] = useState('');

  const wrappedHandleOption = useCallback(
    (option: ChatOption) => {
      if (option.action === 'create_profile') {
        setShowProfileSetup(true);
        return;
      }
      if (option.action === 'go_calendar' && onTabChange) {
        onTabChange('calendar');
        return;
      }
      if (option.action === 'go_shopping' && onTabChange) {
        onTabChange('shopping');
        return;
      }
      if (option.action === 'go_progress' && onTabChange) {
        onTabChange('settings');
        return;
      }
      if (option.action === 'week_plan') {
        if (!hasWeekPlanningProfile) {
          setShowWeekPlanningSetup(true);
          return;
        }
      }
      handleOption(option);
    },
    [handleOption, onTabChange, hasWeekPlanningProfile],
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prependAnchorRef = useRef<{ prevHeight: number; prevTop: number } | null>(null);
  const loadingOlderRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timer);
  }, [scrollToBottom]);

  useEffect(() => {
    if (scrollIntent === 'none') return;

    const el = scrollContainerRef.current;
    const timer = setTimeout(() => {
      if (!el) {
        clearScrollIntent();
        return;
      }
      if (scrollIntent === 'append' || scrollIntent === 'initial') {
        el.scrollTop = el.scrollHeight;
      } else if (scrollIntent === 'prepend' && prependAnchorRef.current) {
        const { prevHeight, prevTop } = prependAnchorRef.current;
        el.scrollTop = el.scrollHeight - prevHeight + prevTop;
        prependAnchorRef.current = null;
      }
      clearScrollIntent();
    }, 50);

    return () => clearTimeout(timer);
  }, [scrollIntent, messages, clearScrollIntent]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || !hasMoreOlder || isLoadingOlder || loadingOlderRef.current) return;
    if (el.scrollTop > 96) return;

    prependAnchorRef.current = {
      prevHeight: el.scrollHeight,
      prevTop: el.scrollTop,
    };
    loadingOlderRef.current = true;
    void loadOlderMessages().finally(() => {
      loadingOlderRef.current = false;
    });
  }, [hasMoreOlder, isLoadingOlder, loadOlderMessages]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim() || isLoading) return;
      handleSendMessage(inputText.trim());
      setInputText('');
    },
    [inputText, isLoading, handleSendMessage],
  );

  if (!hasProfile) {
    return (
      <div className="flex h-[calc(100dvh-60px-64px)] flex-col items-center justify-center px-6 md:h-[calc(100dvh-60px)] -mx-4 -mt-6 -mb-24 md:-mb-6 bg-transparent text-[#191c17]">
        <div className="flex max-w-sm flex-col items-center space-y-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#226046]/15 shadow-sm">
            <span className="font-heading text-3xl font-bold text-[#226046]">
              N
            </span>
          </div>
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold text-[#191c17]">
              Bienvenido a NutriKal
            </h2>
            <p className="font-body text-base leading-relaxed text-[#707a6c]">
              Tu asistente de nutrición personalizado
            </p>
          </div>
          <p className="font-body text-sm leading-relaxed opacity-90 text-[#707a6c]">
            Tres pasos rápidos y te armo tu primera comida.
          </p>
          <button
            type="button"
            onClick={() => setShowProfileSetup(true)}
            className="inline-flex w-full min-h-[52px] items-center justify-center gap-2 rounded-full px-6 py-3 font-body font-semibold transition-all active:scale-[0.98] bg-[#226046] text-[#ffffff]"
          >
            <UserCircle size={20} />
            Crear mi perfil
          </button>
        </div>
        <ProfileSetup isOpen={showProfileSetup} onClose={() => setShowProfileSetup(false)} />
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-6 -mb-24 flex h-[calc(100dvh-60px-64px)] flex-col md:-mb-6 md:h-[calc(100dvh-60px)] bg-transparent text-[#191c17]">

      <div className="pointer-events-none fixed left-0 right-0 top-[60px] z-30 flex justify-end px-4 pt-2 md:static md:pointer-events-auto md:justify-end md:px-4 md:pt-0">
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="pointer-events-auto inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[#ffffff]/90 px-4 py-2 font-body text-sm font-medium text-[#226046] shadow-md ring-1 ring-[#bfcaba]/30 backdrop-blur-md transition hover:bg-[#ffffff] md:shadow-sm"
          aria-label="Ver conversaciones"
        >
          <History size={18} />
          <span className="hidden sm:inline">Conversaciones</span>
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pt-24 pb-32 md:pt-6 md:pb-32"
      >
        {(isLoadingOlder || hasMoreOlder) && (
          <div className="flex justify-center py-2">
            <span className="font-body text-xs text-[#707a6c]">
              {isLoadingOlder ? 'Cargando mensajes anteriores…' : '↑ Deslizá para ver más'}
            </span>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            message={msg}
            onOptionSelect={wrappedHandleOption}
            onApplyPlan={handleApplyPlan}
            onApplyDish={handleApplyDish}
            onRegeneratePlan={handleRegeneratePlan}
            onRegenerateDish={handleRegenerateDish}
            onSwapMeal={handleSwapMeal}
            energyLevel={energyLevel}
            energyRatio={energyRatio}
            showCalories={showCalories}
            chatBusy={isLoading}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="fixed bottom-28 md:bottom-6 left-0 right-0 w-full px-6 z-40"
      >
        <div className="max-w-2xl mx-auto bg-[#ffffff] rounded-xl shadow-xl flex items-center p-2 gap-2 border border-[#bfcaba]/20">
          <button
            type="button"
            className="p-2 text-[#707a6c] hover:text-[#226046]"
            aria-label="Adjuntos"
            disabled
          >
            <Plus size={20} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe tu consulta..."
            disabled={isLoading}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-[#707a6c]/50 outline-none px-2"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="w-10 h-10 bg-[#226046] text-[#ffffff] rounded-lg flex items-center justify-center disabled:opacity-40 transition-opacity"
            aria-label="Enviar mensaje"
          >
            <Send size={18} className="translate-x-[2px]" />
          </button>
        </div>
      </form>

      <ChatHistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} />

      <ProfileSetup isOpen={showProfileSetup} onClose={() => setShowProfileSetup(false)} />
      <WeekPlanningSetup
        isOpen={showWeekPlanningSetup}
        onClose={() => setShowWeekPlanningSetup(false)}
        onComplete={() => {
          setShowWeekPlanningSetup(false);
          runWeekPlanGeneration();
        }}
      />
    </div>
  );
};
