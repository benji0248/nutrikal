import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, UserCircle } from 'lucide-react';
import type { ChatOption, AppTab } from '../../types';
import { ChatHeader } from './ChatHeader';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ProfileSetup } from '../profile/ProfileSetup';
import { Button } from '../ui/Button';
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

  const wrappedHandleOption = useCallback((option: ChatOption) => {
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
  }, [handleOption, onTabChange]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    handleSendMessage(inputText.trim());
    setInputText('');
  }, [inputText, isLoading, handleSendMessage]);

  if (!hasProfile) {
    return (
      <div className="flex flex-col items-center justify-center -mx-4 -mt-6 -mb-24 md:-mb-6 h-[calc(100dvh-60px-64px)] md:h-[calc(100dvh-60px)] px-6">
        <div className="flex flex-col items-center text-center max-w-sm space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-accent/20 flex items-center justify-center">
            <span className="text-accent font-heading font-bold text-3xl">N</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-heading font-bold text-text-primary">
              Bienvenido a NutriKal
            </h2>
            <p className="text-base font-body text-muted leading-relaxed">
              Tu asistente de nutrición personalizado
            </p>
          </div>
          <p className="text-sm font-body text-muted/80 leading-relaxed">
            Son 4 preguntas rápidas. Después te armo el plan de la semana.
          </p>
          <Button
            variant="primary"
            icon={<UserCircle size={20} />}
            onClick={() => setShowProfileSetup(true)}
            fullWidth
          >
            Crear mi perfil
          </Button>
        </div>
        <ProfileSetup
          isOpen={showProfileSetup}
          onClose={() => setShowProfileSetup(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col -mx-4 -mt-6 -mb-24 md:-mb-6 h-[calc(100dvh-60px-64px)] md:h-[calc(100dvh-60px)]">
      <ChatHeader />

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4"
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
        className="sticky bottom-0 border-t border-border bg-surface px-4 py-3 safe-bottom"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribí tu mensaje..."
            disabled={isLoading}
            className="flex-1 bg-surface2 rounded-2xl px-4 py-3 text-sm font-body text-text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[48px] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white disabled:opacity-40 transition-all active:scale-95"
            aria-label="Enviar mensaje"
          >
            <Send size={20} />
          </button>
        </div>
      </form>

      <ProfileSetup
        isOpen={showProfileSetup}
        onClose={() => setShowProfileSetup(false)}
      />
    </div>
  );
};
