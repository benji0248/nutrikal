import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (genAI) return genAI;

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Missing GEMINI_API_KEY');

  genAI = new GoogleGenerativeAI(key);
  return genAI;
}

export const SYSTEM_RULES_CORE = `Salida: solo JSON. Sin markdown.
Campo "text": mensaje corto, sin kcal ni gramos.
Campo "actions": array de acciones.

dishContract — estructura obligatoria:
{
  "contractVersion": 1,
  "nombre": "...",
  "descripcion_humana": "...",
  "tipo_plato": "plato_base_proteina",
  "ingredientes": [
    {"id": "ing_001", "rol": "proteina", "proporcion": 0.40},
    {"id": "ing_z", "rol": "vegetal",  "proporcion": 0.30},
    {"id": "ing_y", "rol": "base",     "proporcion": 0.20},
    {"id": "ing_w", "rol": "grasa",    "proporcion": 0.05},
    {"id": "ing_x", "rol": "toque",    "proporcion": 0.05}
  ]
}

Roles válidos: base, proteina, vegetal, vegetal_hoja, liquido, aromatico, grasa, lacteo, fruta_toque, endulzante, toque.
Proporciones almuerzo/cena: proteina 0.35-0.50, vegetal max 0.45, aromatico/toque max 0.10 cada uno.
IDs solo de la lista de ingredientes del contexto.`;

export const WEEK_FLOW_RULES = `week_plan: usar solo si el contexto tiene FECHAS DE LA SEMANA.
Cada día incluye desayuno, almuerzo, cena, snack. Cada comida: name, prepMinutes, humanPortion, dishContract.
Formato: {"type":"week_plan","days":[{"date":"...","meals":{...}}]}`;

export const GENERAL_ASSISTANT_RULES = `Acciones disponibles:
- suggest_meals: sugerir ideas de platos (usar cuando el usuario pide "que como hoy", "dame una cena", etc.)
- add_meal: agregar una comida al dia (usar con suggest_meals o cuando corresponde)
- swap_meal: cambiar una comida existente
- show_summary: resumen del dia

Si el usuario pide comida, incluir al menos una accion. Si solo charla, no incluir acciones.`;
