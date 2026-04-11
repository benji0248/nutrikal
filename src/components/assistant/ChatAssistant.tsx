import { useRef, useEffect, useState, useCallback } from 'react';
import { Plus, Send, UserCircle } from 'lucide-react';
import type { ChatOption, AppTab } from '../../types';
import { ChatHeader } from './ChatHeader';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ProfileSetup } from '../profile/ProfileSetup';
import { useChatEngine } from './useChatEngine';
import { JOURNAL } from './journalTokens';

interface ChatAssistantProps {
  onTabChange?: (tab: AppTab) => void;
}

export const ChatAssistant = ({ onTabChange }: ChatAssistantProps) => {
  const {
    messages,
    hasProfile,
    handleOption,
    handleSendMessage,
    handleApplyPlan,
    handleRegeneratePlan,
    handleSwapMeal,
    energyLevel,
    energyRatio,
    showCalories,
    isLoading,
  } = useChatEngine();

  const [showProfileSetup, setShowProfileSetup] = useState(false);
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
      handleOption(option);
    },
    [handleOption, onTabChange],
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages]);

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
      <div
        className="flex h-[calc(100dvh-60px-64px)] flex-col items-center justify-center px-6 md:h-[calc(100dvh-60px)] -mx-4 -mt-6 -mb-24 md:-mb-6"
        style={{ backgroundColor: JOURNAL.surface, color: JOURNAL.onSurface }}
      >
        <div className="flex max-w-sm flex-col items-center space-y-6 text-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-[2rem]"
            style={{
              backgroundColor: 'rgba(34, 96, 70, 0.15)',
              boxShadow: JOURNAL.ambientShadow,
            }}
          >
            <span className="font-heading text-3xl font-bold" style={{ color: JOURNAL.primary }}>
              N
            </span>
          </div>
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold" style={{ color: JOURNAL.onSurface }}>
              Bienvenido a NutriKal
            </h2>
            <p className="font-body text-base leading-relaxed" style={{ color: JOURNAL.muted }}>
              Tu asistente de nutrición personalizado
            </p>
          </div>
          <p className="font-body text-sm leading-relaxed opacity-90" style={{ color: JOURNAL.muted }}>
            Son 4 preguntas rápidas. Después te armo el plan de la semana.
          </p>
          <button
            type="button"
            onClick={() => setShowProfileSetup(true)}
            className="inline-flex w-full min-h-[52px] items-center justify-center gap-2 rounded-full px-6 py-3 font-body font-semibold transition-all active:scale-[0.98]"
            style={{ backgroundColor: JOURNAL.primary, color: JOURNAL.onPrimary }}
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
    <div
      className="-mx-4 -mt-6 -mb-24 flex h-[calc(100dvh-60px-64px)] flex-col md:-mb-6 md:h-[calc(100dvh-60px)]"
      style={{ backgroundColor: JOURNAL.surface, color: JOURNAL.onSurface }}
    >
      <ChatHeader />

      <div
        ref={scrollContainerRef}
        className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            message={msg}
            onOptionSelect={wrappedHandleOption}
            onApplyPlan={handleApplyPlan}
            onRegeneratePlan={handleRegeneratePlan}
            onSwapMeal={handleSwapMeal}
            energyLevel={energyLevel}
            energyRatio={energyRatio}
            showCalories={showCalories}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 z-10 border-t border-white/50 px-4 py-3 safe-bottom backdrop-blur-xl"
        style={{ backgroundColor: JOURNAL.glass }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <button
            type="button"
            disabled
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full opacity-50"
            style={{
              backgroundColor: JOURNAL.surfaceElevated,
              boxShadow: JOURNAL.ambientShadow,
              color: JOURNAL.muted,
            }}
            title="Próximamente"
            aria-label="Adjuntos"
          >
            <Plus size={20} strokeWidth={1.75} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribí tu consulta..."
            disabled={isLoading}
            className="min-h-[48px] flex-1 rounded-full border-0 px-5 py-3 font-body text-sm outline-none transition-shadow placeholder:text-[#191c17]/35 focus:ring-2 disabled:opacity-50"
            style={{
              backgroundColor: JOURNAL.surfaceElevated,
              color: JOURNAL.onSurface,
              boxShadow: JOURNAL.ambientShadow,
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = `0 0 0 2px rgba(34, 96, 70, 0.25), ${JOURNAL.ambientShadow}`;
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = JOURNAL.ambientShadow;
            }}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: JOURNAL.primary }}
            aria-label="Enviar mensaje"
          >
            <Send size={20} />
          </button>
        </div>
      </form>

      <ProfileSetup isOpen={showProfileSetup} onClose={() => setShowProfileSetup(false)} />
    </div>
  );
};
