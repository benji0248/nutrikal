import { useRef, useEffect, useState, useCallback } from 'react';
import { Plus, Send, UserCircle } from 'lucide-react';
import type { ChatOption, AppTab } from '../../types';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ProfileSetup } from '../profile/ProfileSetup';
import { useChatEngine } from './useChatEngine';

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
            Son 4 preguntas rápidas. Después te armo el plan de la semana.
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

      <div
        ref={scrollContainerRef}
        className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pt-24 pb-32 md:pt-6 md:pb-32"
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

      <ProfileSetup isOpen={showProfileSetup} onClose={() => setShowProfileSetup(false)} />
    </div>
  );
};
