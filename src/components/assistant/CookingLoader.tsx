import { useEffect, useMemo, useState } from 'react';
import {
  COOKING_LOADER_INGREDIENTS,
  COOKING_LOADER_PHRASES,
} from './cookingLoaderContent';

const INGREDIENT_MS = 1200;
const PHRASE_MS = 2400;
const FADE_MS = 220;

function pickStartIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

export const CookingLoader = () => {
  const phraseOrder = useMemo(() => {
    const start = pickStartIndex(COOKING_LOADER_PHRASES.length);
    return COOKING_LOADER_PHRASES.map(
      (_, i) => COOKING_LOADER_PHRASES[(start + i) % COOKING_LOADER_PHRASES.length],
    );
  }, []);

  const [ingredientIdx, setIngredientIdx] = useState(() =>
    pickStartIndex(COOKING_LOADER_INGREDIENTS.length),
  );
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [ingredientVisible, setIngredientVisible] = useState(true);
  const [phraseVisible, setPhraseVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIngredientVisible(false);
      window.setTimeout(() => {
        setIngredientIdx((prev) => (prev + 1) % COOKING_LOADER_INGREDIENTS.length);
        setIngredientVisible(true);
      }, FADE_MS);
    }, INGREDIENT_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseVisible(false);
      window.setTimeout(() => {
        setPhraseIdx((prev) => (prev + 1) % phraseOrder.length);
        setPhraseVisible(true);
      }, FADE_MS);
    }, PHRASE_MS);
    return () => clearInterval(interval);
  }, [phraseOrder.length]);

  const ingredient = COOKING_LOADER_INGREDIENTS[ingredientIdx];
  const phrase = phraseOrder[phraseIdx];

  return (
    <div className="flex mr-12 animate-fade-in">
      <div className="bg-[#f3f5eb] text-[#191c17] rounded-t-xl rounded-br-xl px-4 py-2.5 shadow-sm max-w-[min(100%,320px)]">
        <div className="flex items-center gap-2.5">
          <span
            className={`text-xl leading-none select-none flex-shrink-0 transition-opacity duration-200 ease-out ${
              ingredientVisible ? 'opacity-100' : 'opacity-0'
            }`}
            role="img"
            aria-hidden
          >
            {ingredient.emoji}
          </span>
          <p
            className={`font-body text-sm font-medium text-[#191c17] leading-snug transition-opacity duration-200 ease-out ${
              phraseVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {phrase}
          </p>
        </div>
      </div>
    </div>
  );
};
