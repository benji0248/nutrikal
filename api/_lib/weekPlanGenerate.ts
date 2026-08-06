import { createHash } from 'node:crypto';
import type { JsonSchema, TextGenerator } from './ai/types.js';
import { SchemaValidationError } from './observability/errors.js';
import type { GenerationTracker, QualityMetric } from './observability/types.js';
import type { GemProfile } from './gemini.js';
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

export interface AiDishIngredient {
  nombre: string;
  rol: string;
  gramos: number;
}

export interface AiDishResponse {
  nombre: string;
  ingredientes: AiDishIngredient[];
  preparacion?: string;
  tiempo_prep: number;
  tip?: string;
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

export const WEEK_PLAN_MODEL = 'gemini-2.5-flash';
export const WEEK_PLAN_PROMPT_VERSION = 'week-plan-oneshot-v2-slim';
export const WEEK_PLAN_BUSINESS_RULES_VERSION = 'week-plan-rules-v1';
export const WEEK_PLAN_ALGORITHM_VERSION = 'week-plan-oneshot-v1';

const WEEK_PLAN_RESPONSE_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          dayMode: { type: 'string' },
          slots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                mealType: { type: 'string' },
                templateId: { type: 'string' },
                link: { type: 'string' },
                isFlexMeal: { type: 'boolean' },
              },
              required: ['mealType', 'templateId'],
            },
          },
        },
        required: ['date', 'dayMode', 'slots'],
      },
    },
    dishes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          templateId: { type: 'string' },
          nombre: { type: 'string' },
          ingredientes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nombre: { type: 'string' },
                rol: { type: 'string' },
                gramos: { type: 'number' },
              },
              required: ['nombre', 'rol', 'gramos'],
            },
          },
          tiempo_prep: { type: 'integer' },
        },
        required: ['templateId', 'nombre', 'ingredientes', 'tiempo_prep'],
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
  preparacion?: string;
  tiempo_prep: number;
  tip?: string;
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

const QUALITY_BASE: Pick<QualityMetric, 'evaluator' | 'evaluatorVersion' | 'source'> = {
  evaluator: 'week-plan-server',
  evaluatorVersion: WEEK_PLAN_ALGORITHM_VERSION,
  source: 'server',
};

function hash(value: unknown): string {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(serialized).digest('hex');
}

export interface WeekPlanGenerationDependencies {
  generator: TextGenerator;
  tracker: GenerationTracker;
}

export async function generateWeekPlanOneShot(params: {
  profile: GemProfile & { metabolic?: MetabolicProfile };
  weekPlanning: WeekPlanningInput;
  weeklyPoolPrompt: string;
  weekDates: string[];
  variationSeed?: string;
}, dependencies: WeekPlanGenerationDependencies): Promise<{
  skeleton: WeekPlanSkeleton;
  rawDishes: Record<string, AiDishResponse>;
}> {
  const { generator, tracker } = dependencies;
  const metabolic = params.profile.metabolic;
  const dailyBudgetKcal = metabolic ? computeDailyBudget(metabolic) : undefined;
  const maintenanceBudgetKcal = metabolic && metabolic.goal !== 'maintain'
    ? computeMaintenanceBudget(metabolic)
    : undefined;

  const system = await tracker.stage('build_prompt', () => buildWeekPlanOneShotPrompt({
      profileName: params.profile.name,
      nationality: params.profile.nationality,
      restrictions: params.profile.restrictions,
      goal: metabolic?.goal,
      weekPlanning: params.weekPlanning,
      weeklyPoolPrompt: params.weeklyPoolPrompt,
      weekDates: params.weekDates,
      dailyBudgetKcal,
      maintenanceBudgetKcal,
    }),
    { promptVersion: WEEK_PLAN_PROMPT_VERSION },
  );

  const variationNote = params.variationSeed ? ` Variación: ${params.variationSeed}.` : '';
  const userMsg = `Generá el plan semanal completo ahora.${variationNote}`;
  const parameters = { temperature: 0.4, thinkingBudget: 0 };
  tracker.updateRecipe({
    promptHash: hash({ system, userMsg }),
    modelParametersHash: hash(parameters),
  });
  tracker.recordPayload('system_prompt', system);
  tracker.recordPayload('user_prompt', userMsg);
  // Slim telemetry: no duplicate canasta / no dish-memory lists.
  tracker.recordPayload('context', {
    weekDates: params.weekDates,
    mealPattern: params.weekPlanning.mealPattern,
    mealRhythmMode: params.weekPlanning.mealRhythmMode,
    activeSlots: params.weekPlanning.activeSlots,
    cookingTime: params.weekPlanning.cookingTime,
    budget: params.weekPlanning.budget,
    weekdayRulesPrompt: params.weekPlanning.weekdayRulesPrompt,
    poolChars: params.weeklyPoolPrompt.length,
    dailyBudgetKcal,
    maintenanceBudgetKcal,
  });

  let lastError: Error | undefined;
  for (let attempt = 0; attempt < PARSE_ATTEMPTS; attempt++) {
    let responseText: string;
    try {
      const response = await tracker.stage(
        'provider_call',
        () => generator.generate({
          model: WEEK_PLAN_MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userMsg },
          ],
          output: { type: 'json', schema: WEEK_PLAN_RESPONSE_SCHEMA, strict: true },
          parameters,
        }),
        { generationAttempt: attempt + 1 },
      );
      responseText = response.content.trim();
      tracker.recordPayload('raw_response', responseText);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      throw error;
    }

    let parsed: OneShotResponse;
    try {
      parsed = await tracker.stage(
        'parse_response',
        () => parseGeminiJson<OneShotResponse>(responseText),
        { generationAttempt: attempt + 1 },
      );
      tracker.recordQuality([{
        ...QUALITY_BASE,
        name: 'json.valid',
        value: true,
        status: 'pass',
        details: { generationAttempt: attempt + 1 },
      }]);
      tracker.recordPayload('parsed_response', parsed);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      tracker.recordQuality([{
        ...QUALITY_BASE,
        name: 'json.valid',
        value: false,
        status: 'fail',
        details: { generationAttempt: attempt + 1 },
      }]);
      tracker.recordPayload('parse_error', lastError.message);
      continue;
    }

    try {
      const result = await tracker.stage('schema_validation', () => {
        if (!parsed?.days?.length || !parsed?.dishes?.length) {
          throw new SchemaValidationError('Planner returned empty week plan');
        }

        let skeleton = enforceTemplateBudget(toSkeleton(parsed), params.weekPlanning);
        skeleton = enforceActiveSlots(skeleton, params.weekPlanning.activeSlots);
        const rawDishes = toRawDishes(parsed.dishes);

        const needed = collectTemplatesToGenerate(skeleton);
        for (const slot of needed) {
          if (!rawDishes[slot.templateId]) {
            throw new SchemaValidationError(`Missing dish for template ${slot.templateId}`);
          }
        }
        return { skeleton, rawDishes };
      }, { generationAttempt: attempt + 1 });

      tracker.recordQuality([{
        ...QUALITY_BASE,
        name: 'schema.compliant',
        value: true,
        status: 'pass',
        details: { generationAttempt: attempt + 1 },
      }]);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      tracker.recordQuality([{
        ...QUALITY_BASE,
        name: 'schema.compliant',
        value: false,
        status: 'fail',
        details: { generationAttempt: attempt + 1 },
      }]);
      console.warn(
        `[week-plan] oneshot_fail attempt=${attempt + 1} err=${lastError.message}`,
      );
    }
  }

  throw lastError ?? new Error('Week plan generation failed');
}
