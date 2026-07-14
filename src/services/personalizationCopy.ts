import type { Ingredient, IngredientSignalEntry, UserProfile } from '../types';
import { CATEGORY_LABELS, type IngredientCategory } from '../types';
import { INGREDIENTS_DB } from '../data/ingredients';

export type PersonalizationMode = 'week_plan' | 'dish' | 'regenerate' | 'swap';

export interface PersonalizationContext {
  mode: PersonalizationMode;
  avoidDishNames?: string[];
  previousDishName?: string;
  dislikedNames?: string[];
  dislikedCategoryLabels?: string[];
  /** Ingredient names present in the suggested dish (to confirm avoidance). */
  dishIngredientNames?: string[];
  poolGeneration?: number;
  recentAcceptedIngredient?: string;
}

/** Resuelve IDs de dislike del perfil a nombres legibles. */
export function resolveDislikedIngredientNames(
  profile: UserProfile | null | undefined,
  customIngredients: Ingredient[] = [],
): string[] {
  if (!profile?.dislikedIngredientIds?.length) return [];
  const map = new Map<string, string>();
  for (const ing of INGREDIENTS_DB) map.set(ing.id, ing.name);
  for (const ing of customIngredients) map.set(ing.id, ing.name);
  const names: string[] = [];
  for (const id of profile.dislikedIngredientIds) {
    const name = map.get(id);
    if (name) names.push(name);
  }
  return names;
}

export function resolveDislikedCategoryLabels(
  profile: UserProfile | null | undefined,
): string[] {
  if (!profile?.dislikedCategories?.length) return [];
  return profile.dislikedCategories
    .map((c) => CATEGORY_LABELS[c as IngredientCategory] ?? c)
    .filter(Boolean);
}

/** Último ingrediente aceptado en señales (proxy de gusto reciente). */
export function getRecentAcceptedIngredientHint(
  signals: IngredientSignalEntry[],
): string | undefined {
  for (let i = signals.length - 1; i >= 0; i--) {
    const s = signals[i];
    if (s.accion !== 'aceptado') continue;
    const name = s.ingredientes_finales[0] ?? s.ingredientes_sugeridos[0];
    if (name?.trim()) return name.trim();
  }
  return undefined;
}

function pickAvoidedDislikes(
  dislikedNames: string[],
  dishIngredientNames?: string[],
): string[] {
  if (!dislikedNames.length) return [];
  if (!dishIngredientNames?.length) return dislikedNames.slice(0, 2);
  const lower = new Set(dishIngredientNames.map((n) => n.toLowerCase()));
  return dislikedNames
    .filter((d) => ![...lower].some((ing) => ing.includes(d.toLowerCase()) || d.toLowerCase().includes(ing)))
    .slice(0, 2);
}

/**
 * Una o dos líneas de memoria explícita para el chat.
 * Prioridad: regenerate/swap > dislikes > variedad > gusto reciente > rotación canasta.
 */
export function buildPersonalizationNote(ctx: PersonalizationContext): string | null {
  const parts: string[] = [];

  if ((ctx.mode === 'regenerate' || ctx.mode === 'swap') && ctx.previousDishName?.trim()) {
    parts.push(`Elegí algo distinto a «${ctx.previousDishName.trim()}» para variar.`);
  }

  const avoided = pickAvoidedDislikes(ctx.dislikedNames ?? [], ctx.dishIngredientNames);
  if (avoided.length === 1) {
    parts.push(`Evité ${avoided[0].toLowerCase()} porque no te gusta.`);
  } else if (avoided.length > 1) {
    parts.push(`Evité ${avoided.map((n) => n.toLowerCase()).join(' y ')} porque no te gustan.`);
  } else if ((ctx.dislikedCategoryLabels?.length ?? 0) > 0 && ctx.mode !== 'regenerate') {
    parts.push(`Respeté que preferís evitar ${ctx.dislikedCategoryLabels![0].toLowerCase()}.`);
  }

  if (ctx.mode === 'week_plan') {
    if ((ctx.avoidDishNames?.length ?? 0) > 0) {
      const sample = ctx.avoidDishNames!.slice(-3).filter(Boolean);
      if (sample.length === 1) {
        parts.push(`Varié para no repetir «${sample[0]}».`);
      } else if (sample.length > 1) {
        parts.push('Varié los platos para no repetir nombres de semanas recientes.');
      }
    }
    if ((ctx.poolGeneration ?? 0) > 1 && parts.length < 2) {
      parts.push('Roté la canasta de ingredientes para que no se sienta igual.');
    }
  }

  if (
    ctx.mode === 'dish'
    && ctx.recentAcceptedIngredient
    && parts.length < 2
  ) {
    parts.push(
      `Como venís eligiendo cosas con ${ctx.recentAcceptedIngredient.toLowerCase()}, prioricé esa línea.`,
    );
  }

  if (parts.length === 0 && (ctx.avoidDishNames?.length ?? 0) > 0 && ctx.mode === 'dish') {
    parts.push('Varié la propuesta para no repetir platos recientes.');
  }

  if (parts.length === 0) return null;
  return parts.slice(0, 2).join(' ');
}

/** Prefijo corto para el texto de bienvenida del plan semanal. */
export function buildWeekPlanMemoryIntro(note: string | null): string {
  if (!note) return 'Tu semana está lista para revisar.';
  return `Tu semana está lista. ${note}`;
}
