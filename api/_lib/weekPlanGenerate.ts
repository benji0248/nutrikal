import { SchemaType, type ResponseSchema } from '@google/generative-ai';
import { getGeminiClient, type GemProfile } from './gemini.js';
import {
  isMealType,
  computeDailyBudget,
  computeMaintenanceBudget,
  type MetabolicProfile,
} from './metabolic.js';
import {
  buildWeekPlanOneShotPrompt,
  getWeekTemplateBudget,
  type WeekPlanningInput,
} from './weekPlanPrompts.js';
import { parseGeminiJson } from './parseGeminiJson.js';
import { withGeminiRetry } from './geminiRetry.js';

export interface AiDishIngredient {
  nombre: string;
  rol: string;
  gramos: number;
}

export interface AiDishResponse {
  nombre: string;
  ingredientes: AiDishIngredient[];
  preparacion: string;
  tiempo_prep: number;
  tip: string;
}

export interface WeekPlanSkeletonSlot {
  mealType: string;
  templateId: string;
  link?: 'prev.cena' | { sameAsTemplateId: string };
  isFlexMeal?: boolean;
  dishHint?: string;
  coreIngredientIds?: string[];
}

export interface WeekPlanSkeletonDay {
  date: string;
  dayMode?: 'normal' | 'maintenance' | 'full_free';
  slots: WeekPlanSkeletonSlot[];
}

export interface WeekPlanSkeleton {
  days: WeekPlanSkeletonDay[];
}

const MAX_TEMPLATES = 8;
const PARSE_ATTEMPTS = 2;

const WEEK_PLAN_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    days: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          date: { type: SchemaType.STRING },
          dayMode: { type: SchemaType.STRING },
          slots: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                mealType: { type: SchemaType.STRING },
                templateId: { type: SchemaType.STRING },
                link: { type: SchemaType.STRING },
                isFlexMeal: { type: SchemaType.BOOLEAN },
              },
              required: ['mealType', 'templateId'],
            },
          },
        },
        required: ['date', 'dayMode', 'slots'],
      },
    },
    dishes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          templateId: { type: SchemaType.STRING },
          nombre: { type: SchemaType.STRING },
          ingredientes: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                nombre: { type: SchemaType.STRING },
                rol: { type: SchemaType.STRING },
                gramos: { type: SchemaType.NUMBER },
              },
              required: ['nombre', 'rol', 'gramos'],
            },
          },
          preparacion: { type: SchemaType.STRING },
          tiempo_prep: { type: SchemaType.INTEGER },
          tip: { type: SchemaType.STRING },
        },
        required: ['templateId', 'nombre', 'ingredientes', 'preparacion', 'tiempo_prep', 'tip'],
      },
    },
  },
  required: ['days', 'dishes'],
};

interface OneShotRawSlot {
  mealType: string;
  templateId: string;
  link?: string;
  isFlexMeal?: boolean;
}

interface OneShotRawDay {
  date: string;
  dayMode: 'normal' | 'maintenance' | 'full_free';
  slots: OneShotRawSlot[];
}

interface OneShotRawDish {
  templateId: string;
  nombre: string;
  ingredientes: AiDishIngredient[];
  preparacion: string;
  tiempo_prep: number;
  tip: string;
}

interface OneShotResponse {
  days: OneShotRawDay[];
  dishes: OneShotRawDish[];
}

function parseLink(link?: string): WeekPlanSkeletonSlot['link'] {
  if (!link?.trim()) return undefined;
  if (link === 'prev.cena') return 'prev.cena';
  if (link.startsWith('same:')) {
    return { sameAsTemplateId: link.slice(5) };
  }
  return undefined;
}

function normalizeMealType(raw: string): string {
  if (raw === 'merienda') return 'snack';
  return raw;
}

function toSkeleton(raw: OneShotResponse): WeekPlanSkeleton {
  return {
    days: raw.days.map((day) => ({
      date: day.date,
      dayMode: day.dayMode ?? 'normal',
      slots: (day.slots ?? []).map((slot) => ({
        mealType: normalizeMealType(slot.mealType),
        templateId: slot.templateId,
        link: parseLink(slot.link),
        isFlexMeal: slot.isFlexMeal,
      })),
    })),
  };
}

function toRawDishes(dishes: OneShotRawDish[]): Record<string, AiDishResponse> {
  const map: Record<string, AiDishResponse> = {};
  for (const d of dishes) {
    if (!d.templateId || !d.nombre) continue;
    map[d.templateId] = {
      nombre: d.nombre,
      ingredientes: d.ingredientes ?? [],
      preparacion: d.preparacion ?? '',
      tiempo_prep: d.tiempo_prep ?? 20,
      tip: d.tip ?? '',
    };
  }
  return map;
}

function enforceTemplateBudget(
  skeleton: WeekPlanSkeleton,
  weekPlanning: WeekPlanningInput,
): WeekPlanSkeleton {
  const templateBudget = Math.min(MAX_TEMPLATES, getWeekTemplateBudget(weekPlanning));
  const keptTemplates = new Set<string>();
  const reusableByMealType = new Map<string, string[]>();

  const rememberReusable = (slot: WeekPlanSkeletonSlot) => {
    const ids = reusableByMealType.get(slot.mealType) ?? [];
    if (!ids.includes(slot.templateId)) {
      ids.push(slot.templateId);
      reusableByMealType.set(slot.mealType, ids);
    }
  };

  const days = skeleton.days.map((day) => {
    if (day.dayMode === 'full_free' || day.slots.length === 0) return day;

    return {
      ...day,
      slots: day.slots.map((slot) => {
        if (slot.link) return slot;
        if (!isMealType(slot.mealType)) return slot;

        if (keptTemplates.has(slot.templateId)) {
          rememberReusable(slot);
          return slot;
        }

        if (keptTemplates.size < templateBudget) {
          keptTemplates.add(slot.templateId);
          rememberReusable(slot);
          return slot;
        }

        const reusable = reusableByMealType.get(slot.mealType);
        const sameAsTemplateId = reusable?.[reusable.length - 1];
        if (!sameAsTemplateId) {
          keptTemplates.add(slot.templateId);
          rememberReusable(slot);
          return slot;
        }

        return {
          ...slot,
          link: { sameAsTemplateId },
          isFlexMeal: slot.isFlexMeal,
        };
      }),
    };
  });

  return { days };
}

function enforceActiveSlots(
  skeleton: WeekPlanSkeleton,
  activeSlots: string[],
): WeekPlanSkeleton {
  const ownedByMealType = new Map<string, string[]>();
  for (const day of skeleton.days) {
    for (const slot of day.slots) {
      if (slot.link) continue;
      if (!ownedByMealType.has(slot.mealType)) {
        ownedByMealType.set(slot.mealType, []);
      }
      const ids = ownedByMealType.get(slot.mealType)!;
      if (!ids.includes(slot.templateId)) {
        ids.push(slot.templateId);
      }
    }
  }

  const days = skeleton.days.map((day) => {
    if (day.dayMode === 'full_free') return day;

    const existingSlots = [...day.slots];
    const existingMealTypes = new Set(existingSlots.map((s) => s.mealType));

    for (const mealType of activeSlots) {
      if (existingMealTypes.has(mealType)) continue;

      const ownedIds = ownedByMealType.get(mealType);
      const sameAsTemplateId = ownedIds?.[0];

      if (sameAsTemplateId) {
        existingSlots.push({
          mealType,
          templateId: sameAsTemplateId,
          link: { sameAsTemplateId },
        });
      }
    }

    return { ...day, slots: existingSlots };
  });

  return { days };
}

export function collectTemplatesToGenerate(skeleton: WeekPlanSkeleton): WeekPlanSkeletonSlot[] {
  const byId = new Map<string, WeekPlanSkeletonSlot>();

  for (const day of skeleton.days) {
    if (day.dayMode === 'full_free' || day.slots.length === 0) continue;
    for (const slot of day.slots) {
      if (slot.link === 'prev.cena') continue;
      if (slot.link && typeof slot.link === 'object' && slot.link.sameAsTemplateId) continue;
      if (!byId.has(slot.templateId)) {
        byId.set(slot.templateId, slot);
      }
    }
  }

  return [...byId.values()];
}

export async function generateWeekPlanOneShot(params: {
  profile: GemProfile & { metabolic?: MetabolicProfile };
  weekPlanning: WeekPlanningInput;
  weeklyPoolPrompt: string;
  forbiddenDishNames: string[];
  weekDates: string[];
  variationSeed?: string;
}): Promise<{ skeleton: WeekPlanSkeleton; rawDishes: Record<string, AiDishResponse> }> {
  const metabolic = params.profile.metabolic;
  const dailyBudgetKcal = metabolic ? computeDailyBudget(metabolic) : undefined;
  const maintenanceBudgetKcal = metabolic && metabolic.goal !== 'maintain'
    ? computeMaintenanceBudget(metabolic)
    : undefined;

  const system = buildWeekPlanOneShotPrompt({
    profileName: params.profile.name,
    nationality: params.profile.nationality,
    restrictions: params.profile.restrictions,
    goal: metabolic?.goal,
    weekPlanning: params.weekPlanning,
    weeklyPoolPrompt: params.weeklyPoolPrompt,
    forbiddenDishNames: params.forbiddenDishNames,
    weekDates: params.weekDates,
    dailyBudgetKcal,
    maintenanceBudgetKcal,
  });

  const model = getGeminiClient().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: WEEK_PLAN_RESPONSE_SCHEMA,
      temperature: 0.4,
    },
    systemInstruction: system,
  });

  const variationNote = params.variationSeed ? ` Variación: ${params.variationSeed}.` : '';
  const userMsg = `Generá el plan semanal completo ahora.${variationNote}`;

  let lastError: Error | undefined;
  for (let attempt = 0; attempt < PARSE_ATTEMPTS; attempt++) {
    try {
      const result = await withGeminiRetry(
        () => model.generateContent(userMsg),
        `week_plan_oneshot_a${attempt + 1}`,
        { maxAttempts: 3, baseDelayMs: 900 },
      );
      const text = result.response.text().trim();
      const parsed = parseGeminiJson<OneShotResponse>(text);
      if (!parsed?.days?.length || !parsed?.dishes?.length) {
        throw new Error('Planner returned empty week plan');
      }

      let skeleton = enforceTemplateBudget(toSkeleton(parsed), params.weekPlanning);
      skeleton = enforceActiveSlots(skeleton, params.weekPlanning.activeSlots);
      const rawDishes = toRawDishes(parsed.dishes);

      const needed = collectTemplatesToGenerate(skeleton);
      for (const slot of needed) {
        if (!rawDishes[slot.templateId]) {
          throw new Error(`Missing dish for template ${slot.templateId}`);
        }
      }

      return { skeleton, rawDishes };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[week-plan] oneshot_fail attempt=${attempt + 1} err=${lastError.message}`,
      );
    }
  }

  throw lastError ?? new Error('Week plan generation failed');
}
