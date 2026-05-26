import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (genAI) return genAI;

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Missing GEMINI_API_KEY');

  genAI = new GoogleGenerativeAI(key);
  return genAI;
}

/** Nombres de país (onboarding) → código ISO corto. */
const COUNTRY_TO_CODE: Record<string, string> = {
  argentina: 'ar',
  bolivia: 'bo',
  brasil: 'br',
  chile: 'cl',
  colombia: 'co',
  'costa rica': 'cr',
  cuba: 'cu',
  ecuador: 'ec',
  'el salvador': 'sv',
  españa: 'es',
  spain: 'es',
  'estados unidos': 'us',
  usa: 'us',
  guatemala: 'gt',
  honduras: 'hn',
  italia: 'it',
  italy: 'it',
  méxico: 'mx',
  mexico: 'mx',
  nicaragua: 'ni',
  panamá: 'pa',
  panama: 'pa',
  paraguay: 'py',
  perú: 'pe',
  peru: 'pe',
  'puerto rico': 'pr',
  'república dominicana': 'do',
  'republica dominicana': 'do',
  uruguay: 'uy',
  venezuela: 've',
};

/** Jerga / estilo de habla por código de nacionalidad. */
const JERGA_MAP: Record<string, string> = {
  ar: 'Hablá en español argentino (vos, dale, bárbaro).',
  bo: 'Hablá en español boliviano (tú/usted, cálido).',
  br: 'Hablá en portugués brasileño o español con tono brasileño si el usuario escribe en español.',
  cl: 'Hablá en español chileno (tú, po, cachái).',
  co: 'Hablá en español colombiano (tú/usted, listo, con gusto).',
  cr: 'Hablá en español costarricense (usted/tú, cálido).',
  cu: 'Hablá en español cubano (tú, asere, tranquilo).',
  ec: 'Hablá en español ecuatoriano (tú, listo).',
  es: 'Hablá en español de España (tú/vosotros, vale, tío).',
  gt: 'Hablá en español guatemalteco (usted/tú, amable).',
  hn: 'Hablá en español hondureño (usted/tú, cálido).',
  it: 'Hablá en español o italiano según el mensaje del usuario; tono italiano cálido.',
  mx: 'Hablá en español mexicano (tú, órale, qué tal).',
  ni: 'Hablá en español nicaragüense (usted/tú, cálido).',
  pa: 'Hablá en español panameño (usted/tú, amable).',
  pe: 'Hablá en español peruano (tú, pue, causa).',
  pr: 'Hablá en español puertorriqueño (tú, wepa, cálido).',
  py: 'Hablá en español paraguayo (vos/tú, amable).',
  sv: 'Hablá en español salvadoreño (usted/tú, cálido).',
  us: 'Hablá en español neutro latino o inglés según el mensaje del usuario.',
  uy: 'Hablá en español uruguayo (vos, ta, bárbaro).',
  ve: 'Hablá en español venezolano (tú/usted, chamo, vale).',
  do: 'Hablá en español dominicano (tú, klk, cálido).',
};

function getJerga(code: string): string {
  return JERGA_MAP[code] ?? 'Hablá en español neutro y cálido.';
}

/** La IA ya conoce cada cocina; el perfil solo define el default cuando el usuario no especifica. */
function getCuisineContext(code: string, displayName?: string): string {
  if (code === 'neutral' || !displayName) {
    return 'Si el usuario no indica estilo culinario, proponé platos variados y coherentes con lo que pida.';
  }
  return [
    `El usuario es de ${displayName}.`,
    'Si su mensaje no pide otra cocina explícitamente, usá platos y técnicas típicas de esa cultura (confiá en tu conocimiento culinario).',
    'Si en el mensaje pide un estilo distinto, eso manda sobre la nacionalidad del perfil.',
  ].join(' ');
}

/** Acepta "Argentina", "ar", "AR", etc. */
export function normalizeNationality(raw?: string): { code: string; displayName?: string } {
  if (!raw?.trim()) return { code: 'neutral' };
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  if (lower.length === 2 && JERGA_MAP[lower]) {
    return { code: lower, displayName: trimmed };
  }

  const fromName = COUNTRY_TO_CODE[lower];
  if (fromName) {
    return { code: fromName, displayName: trimmed };
  }

  return { code: 'neutral', displayName: trimmed };
}

export interface GemProfile {
  nationality?: string;
  restrictions?: string[];
  name?: string;
}

export interface BuildPromptOptions {
  /** Nombres de platos ya sugeridos en la conversación — evitar repetirlos. */
  recentDishes?: string[];
}

/** Extrae nombres de platos del historial (respuestas JSON del asistente). */
export function extractRecentDishNames(
  history: Array<{ role: string; content: string }>,
): string[] {
  const names: string[] = [];
  for (const msg of history) {
    if (msg.role !== 'assistant') continue;
    const content = msg.content.trim();
    if (!content) continue;
    try {
      const parsed = JSON.parse(content) as { nombre?: unknown };
      if (typeof parsed.nombre === 'string' && parsed.nombre.trim()) {
        names.push(parsed.nombre.trim());
      }
    } catch {
      const match = content.match(/"nombre"\s*:\s*"([^"\\]+)"/);
      if (match?.[1]) names.push(match[1].trim());
    }
  }
  return [...new Set(names)].slice(-12);
}

export function buildSystemPrompt(profile: GemProfile, options: BuildPromptOptions = {}): string {
  const { code, displayName } = normalizeNationality(profile.nationality);
  const jerga = getJerga(code);
  const cuisine = getCuisineContext(code, displayName ?? profile.nationality);
  const restrictions = profile.restrictions?.length
    ? `Restricciones alimentarias (respetalas siempre): ${profile.restrictions.join(', ')}.`
    : '';

  const recent = options.recentDishes?.filter(Boolean) ?? [];
  const antiRepeat = recent.length > 0
    ? `Platos que YA sugeriste en esta charla (NO los repitas ni hagas variaciones mínimas): ${recent.join(' · ')}.`
    : 'Es la primera sugerencia de la charla: podés ser creativo sin restricción de historial.';

  const greeting = profile.name ? `El usuario se llama ${profile.name}.` : '';

  return [
    `Sos un chef creativo, práctico y cálido. ${jerga}`,
    greeting,
    cuisine,
    restrictions,
    '',
    '## Creatividad y variedad',
    '- Cada respuesta: plato distinto en nombre, técnica y presentación.',
    antiRepeat,
    '',
    '## Ingredientes que menciona el usuario',
    '- Los ingredientes que nombra son un NÚCLEO obligatorio: deben estar en el plato con un rol claro.',
    '- Tenés libertad total para sumar los que quieras (quesos, huevos, hierbas, salsas, legumbres, frutos secos, etc.) si encajan con la cultura y el plato.',
    '- No limites la receta a solo esos ingredientes: enriquecé con técnicas y extras que eleven el plato.',
    '',
    '## Nutrición',
    '- No calcules ni menciones calorías, macros ni gramos exactos en la preparación; solo en el array "ingredientes" con gramos estimados.',
    '- Si el usuario pide un objetivo calórico, ajustá porciones de forma razonable en "gramos"; el sistema calcula el resto.',
    '',
    '## Salida',
    'Respondé ÚNICAMENTE con este JSON (sin markdown, sin texto extra):',
    '{',
    '  "nombre": "nombre evocador y específico del plato",',
    '  "ingredientes": [',
    '    { "nombre": "ingrediente", "rol": "proteina|base|vegetal|grasa|lacteo|aromatico|liquido|toque", "gramos": 200 }',
    '  ],',
    '  "preparacion": "pasos claros de preparación",',
    '  "tiempo_prep": 25,',
    '  "tip": "consejo breve"',
    '}',
  ].filter(Boolean).join('\n');
}

/** Config de generación con variedad alta (Gemini). */
export const GEMINI_GENERATION_CONFIG = {
  responseMimeType: 'application/json' as const,
  temperature: 0.95,
};
