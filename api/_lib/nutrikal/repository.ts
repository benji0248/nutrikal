import type { SupabaseClient } from '@supabase/supabase-js';
import { ALL_CATEGORIES, MEAL_TYPE_ORDER } from '../../../src/types/index.js';
import type { Ingredient, IngredientSignalEntry, UserProfile, WeekPlanningProfile } from '../../../src/types/index.js';
import type { ComidaRegistrada, ContextoUsuario, Intervalo, RepositorioNutrikal } from '../../../src/domain/nutrikal/types.js';
import { ErrorFuncionesNutrikal, fechaValida, validarIntervalo } from '../../../src/domain/nutrikal/validation.js';

type Row = Record<string, unknown>;
const sourceError = () => new ErrorFuncionesNutrikal('datos_no_disponibles', 'No pude leer datos válidos de Nutrikal. No modifiqué ninguna información.');
function strings(value: unknown): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw sourceError();
  return value;
}
const restrictions = ['vegetarian', 'vegan', 'gluten_free', 'lactose_free', 'low_sodium', 'diabetic'];

function rutina(value: unknown): WeekPlanningProfile | null {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw sourceError();
  const raw = value as Row;
  if (!raw.completedAt) return null;
  if (typeof raw.completedAt !== 'string' || !['four', 'three_no_snack', 'no_breakfast', 'two_main'].includes(String(raw.mealPattern))
    || !['carryover_dinner_to_lunch', 'streak', 'max_variety', 'balanced'].includes(String(raw.mealRhythmMode))
    || !['rapido', 'normal', 'elaborado'].includes(String(raw.cookingTime)) || !['economico', 'normal', 'premium'].includes(String(raw.budget))) throw sourceError();
  const rules = raw.weekdayFlexRules ?? [];
  if (!Array.isArray(rules) || rules.some((rule) => !rule || !Number.isInteger(rule.weekday) || rule.weekday < 0 || rule.weekday > 6 || !['normal', 'maintenance', 'full_free'].includes(rule.mode))) throw sourceError();
  return { ...raw, weekdayFlexRules: rules } as unknown as WeekPlanningProfile;
}

function contexto(row: Row | null, usuarioId: string): ContextoUsuario {
  if (!row) return { existe: false, objetivo: null, preferencias: null, rutina: null, perfilMetabolico: null, historialCanastas: [] };
  const savedRestrictions = strings(row.restrictions);
  if (savedRestrictions.some((r) => !restrictions.includes(r))) throw sourceError();
  const preferencias = { restrictions: savedRestrictions as UserProfile['restrictions'], dislikedIngredientIds: strings(row.disliked_ingredient_ids),
    dislikedCategories: strings(row.disliked_categories), allowedExceptions: strings(row.allowed_exceptions) };
  const objetivo = ['lose', 'maintain', 'gain'].includes(String(row.goal)) ? row.goal as UserProfile['goal'] : null;
  let perfilMetabolico: UserProfile | null = null;
  if (objetivo && fechaValida(row.birth_date) && row.birth_date <= new Date().toISOString().slice(0, 10) && ['male', 'female'].includes(String(row.sex))
    && Number.isFinite(row.height_cm) && Number(row.height_cm) > 0 && Number.isFinite(row.weight_kg) && Number(row.weight_kg) > 0
    && ['sedentary', 'light', 'moderate', 'active', 'very_active'].includes(String(row.activity_level))) {
    perfilMetabolico = { ...preferencias, id: String(row.profile_id ?? usuarioId), name: String(row.name ?? ''), birthDate: row.birth_date,
      sex: row.sex as UserProfile['sex'], heightCm: Number(row.height_cm), weightKg: Number(row.weight_kg), goal: objetivo,
      activityLevel: row.activity_level as UserProfile['activityLevel'], nationality: typeof row.nationality === 'string' ? row.nationality : undefined,
      createdAt: String(row.created_at ?? ''), updatedAt: String(row.updated_at ?? ''), lastRecalibration: String(row.last_recalibration ?? '') };
  }
  if (row.plan_memory != null && (typeof row.plan_memory !== 'object' || Array.isArray(row.plan_memory))) throw sourceError();
  const memory = row.plan_memory as Row | null;
  const history = memory?.recentPoolHistory ?? [];
  if (!Array.isArray(history)) throw sourceError();
  return { existe: true, objetivo, preferencias, rutina: rutina(row.week_planning), perfilMetabolico, historialCanastas: history.slice(-5).map(strings) };
}

async function readAll(load: (offset: number) => PromiseLike<{ data: Row[] | null; error: unknown; count: number | null }>): Promise<Row[]> {
  const rows: Row[] = [];
  for (;;) {
    const result = await load(rows.length);
    if (result.error || !result.data || result.count === null) throw sourceError();
    if (result.count > 10000) throw new ErrorFuncionesNutrikal('intervalo_demasiado_grande', 'Hay demasiados registros. Consultá un intervalo más corto.');
    rows.push(...result.data);
    if (rows.length > 10000) throw new ErrorFuncionesNutrikal('intervalo_demasiado_grande', 'Hay demasiados registros. Consultá un intervalo más corto.');
    if (rows.length >= result.count) return rows;
    if (!result.data.length) throw sourceError();
  }
}

/** Only this adapter knows Supabase's schema. Every read is scoped to the bound authenticated user. */
export function crearRepositorioSupabase(db: SupabaseClient): RepositorioNutrikal {
  return {
    leerContexto: async (usuarioId) => {
      const result = await db.from('user_profiles').select('user_id,profile_id,name,birth_date,sex,height_cm,weight_kg,activity_level,goal,restrictions,disliked_ingredient_ids,disliked_categories,allowed_exceptions,nationality,created_at,updated_at,last_recalibration,week_planning,plan_memory').eq('user_id', usuarioId).maybeSingle();
      if (result.error) throw sourceError();
      return contexto(result.data as Row | null, usuarioId);
    },
    leerIngredientesPropios: async (usuarioId) => {
      const rows = await readAll((offset) => db.from('custom_ingredients').select('id,name,category,calories,protein,carbs,fat', { count: 'exact' }).eq('user_id', usuarioId).order('id').range(offset, offset + 999));
      return rows.map((row) => {
        if (typeof row.id !== 'string' || typeof row.name !== 'string' || !ALL_CATEGORIES.includes(row.category as Ingredient['category'])
          || ['calories', 'protein', 'carbs', 'fat'].some((key) => typeof row[key] !== 'number' || !Number.isFinite(row[key]) || Number(row[key]) < 0)) throw sourceError();
        return { id: row.id, name: row.name, category: row.category as Ingredient['category'], calories: Number(row.calories), protein: Number(row.protein), carbs: Number(row.carbs), fat: Number(row.fat), isCustom: true };
      });
    },
    leerComidas: async (usuarioId, rango: Intervalo) => {
      validarIntervalo(rango);
      const rows = await readAll((offset) => db.from('meals').select('id,date,meal_type,name,completed,is_alternative,entries,ai_ingredients', { count: 'exact' }).eq('user_id', usuarioId)
        .gte('date', rango.desde).lte('date', rango.hasta).order('date').order('id').range(offset, offset + 999));
      return rows.map((row): ComidaRegistrada => {
        if (!fechaValida(row.date) || !MEAL_TYPE_ORDER.includes(row.meal_type as ComidaRegistrada['tipo']) || typeof row.id !== 'string' || typeof row.name !== 'string') throw sourceError();
        const entries = row.entries ?? [];
        const aiIngredients = row.ai_ingredients ?? [];
        if (!Array.isArray(entries) || !Array.isArray(aiIngredients)
          || entries.some((entry) => !entry || typeof entry.ingredientId !== 'string' || !Number.isFinite(entry.grams) || entry.grams < 0)
          || aiIngredients.some((entry) => !entry || typeof entry.name !== 'string')) throw sourceError();
        return { id: row.id, fecha: row.date, tipo: row.meal_type as ComidaRegistrada['tipo'], nombre: row.name,
          realizada: row.completed === true, alternativa: row.is_alternative === true, ingredientes: entries, ingredientesIA: aiIngredients };
      });
    },
    leerSenales: async (usuarioId, rango) => {
      validarIntervalo(rango, 120);
      const rows = await readAll((offset) => db.from('ingredient_signals').select('id,fecha,comida,ingredientes_sugeridos,ingredientes_finales,ingredientes_removidos,ingredientes_agregados,accion', { count: 'exact' })
        .eq('user_id', usuarioId).gte('fecha', rango.desde).lte('fecha', rango.hasta).order('fecha').order('id').range(offset, offset + 999));
      return rows.map((row): IngredientSignalEntry => {
        if (!fechaValida(row.fecha) || !MEAL_TYPE_ORDER.includes(row.comida as IngredientSignalEntry['comida']) || typeof row.id !== 'string'
          || !['aceptado', 'rechazado', 'modificado', 'ignorado', 'repetido'].includes(String(row.accion))) throw sourceError();
        return { id: row.id, fecha: row.fecha, comida: row.comida as IngredientSignalEntry['comida'], accion: row.accion as IngredientSignalEntry['accion'],
          ingredientes_sugeridos: strings(row.ingredientes_sugeridos), ingredientes_finales: strings(row.ingredientes_finales), ingredientes_removidos: strings(row.ingredientes_removidos), ingredientes_agregados: strings(row.ingredientes_agregados) };
      });
    },
  };
}
