import type { ChatOption, MealType } from '../types';
import { mealTypeToPromptLabel } from './mealTimeHelpers';

function mealTypeArticle(mealType: MealType): 'un' | 'una' {
  return mealType === 'cena' || mealType === 'snack' ? 'una' : 'un';
}

/** Contextual suggestion chips when opening chat from a Calendario meal slot. */
export function buildCalendarSlotOptions(
  mealType: MealType,
  hasExistingMeal: boolean,
): ChatOption[] {
  const label = mealTypeToPromptLabel(mealType);
  const article = mealTypeArticle(mealType);
  const options: ChatOption[] = [
    {
      id: 'gen_slot',
      label: `Generame ${article} ${label}.`,
      action: 'generate_for_slot',
      icon: 'UtensilsCrossed',
    },
    {
      id: 'quick',
      label: 'Quiero algo rápido.',
      action: 'quick_reply',
      payload: `Quiero algo rápido para mi ${label}.`,
      icon: 'Clock',
    },
    {
      id: 'pollo',
      label: 'Algo con pollo.',
      action: 'quick_reply',
      payload: `Quiero algo con pollo para mi ${label}.`,
      icon: 'UtensilsCrossed',
    },
    {
      id: 'eco',
      label: 'Que sea económico.',
      action: 'quick_reply',
      payload: `Quiero algo económico para mi ${label}.`,
      icon: 'Check',
    },
  ];

  if (hasExistingMeal) {
    options.unshift({
      id: 'change_meal',
      label: 'Cambiame esta comida.',
      action: 'generate_for_slot',
      payload: 'change',
      icon: 'RefreshCw',
    });
  }

  return options;
}

export function buildCalendarSlotIntro(
  mealType: MealType,
  dateLabel: string,
  existingMealName?: string,
): string {
  const label = mealTypeToPromptLabel(mealType);
  if (existingMealName) {
    return `Estás armando tu ${label} de ${dateLabel}. Ahora tenés «${existingMealName}». Contame qué querés cambiar o elegí una sugerencia.`;
  }
  return `Estás armando tu ${label} de ${dateLabel}. Contame qué querés comer o elegí una sugerencia.`;
}
