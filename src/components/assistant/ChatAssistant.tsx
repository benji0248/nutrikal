import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import type { ChatOption, Ingredient } from '../../types';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { ChatHeader } from './ChatHeader';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ProfileSetup } from '../profile/ProfileSetup';
import { useChatEngine } from './useChatEngine';

export const ChatAssistant = () => {
  const {
    messages,
    handleOption,
    handleSelectDish,
    handleServingsChange,
    handleWaterChange,
    energyLevel,
    energyRatio,
    showCalories,
  } = useChatEngine();

  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const wrappedHandleOption = useCallback((option: ChatOption) => {
    if (option.action === 'create_profile') {
      setShowProfileSetup(true);
      return;
    }
    handleOption(option);
  }, [handleOption]);

  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const allIngredients: Ingredient[] = useMemo(
    () => [...INGREDIENTS_DB, ...customIngredients],
    [customIngredients],
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !bottomRef.current) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;

    if (isNearBottom) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex flex-col -mx-4 -mt-6 -mb-24 md:-mb-6" style={{ height: 'calc(100dvh - 60px - 64px)' }}>
      <ChatHeader />

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {messages.map((msg, idx) => (
          <ChatMessageBubble
            key={msg.id}
            message={msg}
            onOptionSelect={wrappedHandleOption}
            onDishSelect={handleSelectDish}
            onServingsChange={handleServingsChange}
            onWaterChange={handleWaterChange}
            energyLevel={energyLevel}
            energyRatio={energyRatio}
            showCalories={showCalories}
            allIngredients={allIngredients}
            isLast={idx === messages.length - 1 || isLastOptionsBlock(messages, idx)}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <ProfileSetup
        isOpen={showProfileSetup}
        onClose={() => setShowProfileSetup(false)}
      />
    </div>
  );
};

/**
 * Only render option chips for the last options message in the chat,
 * so previous options are hidden after user has moved on.
 */
function isLastOptionsBlock(messages: Array<{ type: string }>, idx: number): boolean {
  if (messages[idx].type !== 'assistant-options') return false;
  for (let i = idx + 1; i < messages.length; i++) {
    if (messages[i].type === 'assistant-options') return false;
  }
  return true;
}
