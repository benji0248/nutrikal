import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Send, X } from 'lucide-react';
import type { ChatOption, AppTab } from '../../types';
import { ChatMessageBubble } from '../assistant/ChatMessageBubble';
import { useChatEngine } from '../assistant/useChatEngine';
import { useChatStore } from '../../store/useChatStore';
import { ProfileSetup } from '../profile/ProfileSetup';
import { WeekPlanningSetup } from '../profile/WeekPlanningSetup';

interface CalendarMealChatProps {
  title: string;
  onClose: () => void;
  onTabChange?: (tab: AppTab) => void;
}

/**
 * Chat instance embedded over Calendario — reuses the NutriKal chat engine
 * without navigating away from the calendar tab.
 */
export function CalendarMealChat({ title, onClose, onTabChange }: CalendarMealChatProps) {
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

  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showWeekPlanningSetup, setShowWeekPlanningSetup] = useState(false);
  const [inputText, setInputText] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const wrappedHandleOption = useCallback(
    (option: ChatOption) => {
      if (option.action === 'create_profile') {
        setShowProfileSetup(true);
        return;
      }
      if (option.action === 'go_calendar') {
        onClose();
        return;
      }
      if (option.action === 'go_shopping' && onTabChange) {
        onClose();
        onTabChange('shopping');
        return;
      }
      if (option.action === 'go_progress' && onTabChange) {
        onClose();
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
    [handleOption, onClose, onTabChange, hasWeekPlanningProfile],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 50);
    return () => clearTimeout(timer);
  }, [messages.length]);

  useEffect(() => {
    if (scrollIntent === 'none') return;
    const el = scrollContainerRef.current;
    const timer = setTimeout(() => {
      if (el && (scrollIntent === 'append' || scrollIntent === 'initial')) {
        el.scrollTop = el.scrollHeight;
      }
      clearScrollIntent();
    }, 50);
    return () => clearTimeout(timer);
  }, [scrollIntent, messages, clearScrollIntent]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim() || isLoading) return;
      handleSendMessage(inputText.trim());
      setInputText('');
    },
    [inputText, isLoading, handleSendMessage],
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-[#191c17]/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative z-10 flex h-[min(92dvh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] bg-[#f8faf1] shadow-[0px_-20px_60px_rgba(25,28,23,0.16)] animate-slide-up md:h-[min(85dvh,760px)] md:rounded-[1.75rem] md:animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#bfcaba]/25 bg-[rgba(248,250,241,0.92)] px-4 py-3 backdrop-blur-xl md:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-body font-medium uppercase tracking-wider text-[#707a6c]">
              Calendario
            </p>
            <h2 className="truncate font-heading text-base font-bold text-[#226046] md:text-lg">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-[#f3f5eb] transition-colors"
            aria-label="Cerrar chat"
          >
            <X size={20} className="text-[#5a6258]" />
          </button>
        </header>

        {!hasProfile ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="font-body text-sm text-[#707a6c]">
              Creá tu perfil para pedir comidas con NutriKal.
            </p>
            <button
              type="button"
              onClick={() => setShowProfileSetup(true)}
              className="min-h-[48px] rounded-full bg-[#226046] px-6 py-2.5 font-body text-sm font-semibold text-white"
            >
              Crear mi perfil
            </button>
          </div>
        ) : (
          <>
            <div
              ref={scrollContainerRef}
              className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 md:px-5"
            >
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
              className="shrink-0 border-t border-[#bfcaba]/25 bg-[#f8faf1] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5"
            >
              <div className="flex items-center gap-2 rounded-xl border border-[#bfcaba]/20 bg-white p-2 shadow-sm">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Escribí qué querés comer..."
                  disabled={isLoading}
                  className="min-w-0 flex-1 border-none bg-transparent px-2 text-sm font-medium outline-none placeholder:text-[#707a6c]/50 focus:ring-0"
                  aria-label="Mensaje para NutriKal"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#226046] text-white transition-opacity disabled:opacity-40"
                  aria-label="Enviar mensaje"
                >
                  <Send size={18} className="translate-x-[1px]" />
                </button>
              </div>
            </form>
          </>
        )}

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
    </div>,
    document.body,
  );
}
