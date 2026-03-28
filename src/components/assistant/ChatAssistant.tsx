import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Send } from 'lucide-react';
import type { ChatOption, Ingredient, AppTab } from '../../types';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { ChatHeader } from './ChatHeader';
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
    handleSelectDish,
    handleServingsChange,
    handleWaterChange,
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
    if (option.action === 'send_text' && option.payload) {
      handleSendMessage(option.payload);
      return;
    }
    handleOption(option);
  }, [handleOption, handleSendMessage, onTabChange]);

  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const allIngredients: Ingredient[] = useMemo(
    () => [...INGREDIENTS_DB, ...customIngredients],
    [customIngredients],
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="flex flex-col -mx-4 -mt-6 -mb-24 md:-mb-6 h-[calc(100dvh-60px-64px)] md:h-[calc(100dvh-60px)]">
      <ChatHeader />

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4"
      >
        {messages.map((msg, idx) => (
          <ChatMessageBubble
            key={msg.id}
            message={msg}
            onOptionSelect={wrappedHandleOption}
            onDishSelect={handleSelectDish}
            onServingsChange={handleServingsChange}
            onWaterChange={handleWaterChange}
            onApplyPlan={handleApplyPlan}
            onRegeneratePlan={handleRegeneratePlan}
            onSwapMeal={handleSwapMeal}
            energyLevel={energyLevel}
            energyRatio={energyRatio}
            showCalories={showCalories}
            allIngredients={allIngredients}
            isLast={idx === messages.length - 1 || isLastOptionsBlock(messages, idx)}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Text input — only show when user has a profile */}
      {hasProfile && (
        <form
          onSubmit={onSubmit}
          className="sticky bottom-0 border-t border-border bg-surface px-4 py-3 safe-bottom"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
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
      )}

      <ProfileSetup
        isOpen={showProfileSetup}
        onClose={() => setShowProfileSetup(false)}
      />
    </div>
  );
};

function isLastOptionsBlock(messages: Array<{ type: string }>, idx: number): boolean {
  if (messages[idx].type !== 'assistant-options') return false;
  for (let i = idx + 1; i < messages.length; i++) {
    if (messages[i].type === 'assistant-options') return false;
  }
  return true;
}
