import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (genAI) return genAI;

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Missing GEMINI_API_KEY');

  genAI = new GoogleGenerativeAI(key);
  return genAI;
}

/** Jerga / estilo de habla por código de nacionalidad. */
const JERGA_MAP: Record<string, string> = {
  ar: 'Hablá en español argentino (vos, dale, bárbaro).',
  co: 'Hablá en español colombiano (tú/usted, listo, con gusto).',
  mx: 'Hablá en español mexicano (tú, órale, qué tal).',
  cl: 'Hablá en español chileno (tú, po, cachái).',
  pe: 'Hablá en español peruano (tú, pue, causa).',
  uy: 'Hablá en español uruguayo (vos, ta, bárbaro).',
  ve: 'Hablá en español venezolano (tú/usted, chamo, vale).',
  es: 'Hablá en español de España (tú/vosotros, vale, tío).',
};

function getJerga(nationality: string): string {
  return JERGA_MAP[nationality] ?? 'Hablá en español neutro y cálido.';
}

export interface GemProfile {
  nationality?: string;
  restrictions?: string[];
  name?: string;
}

export function buildSystemPrompt(profile: GemProfile): string {
  const jerga = getJerga(profile.nationality ?? 'ar');
  const cuisine = profile.nationality
    ? `El usuario es de nacionalidad ${profile.nationality}. Cociná platos típicos de esa cultura.`
    : 'Cociná platos variados de distintas culturas.';
  const restrictions = profile.restrictions?.length
    ? `Tiene restricciones alimentarias: ${profile.restrictions.join(', ')}.`
    : '';

  return [
    `Sos un chef práctico y cálido. ${jerga}`,
    cuisine,
    restrictions,
    '',
    'Respondé ÚNICAMENTE con este JSON y nada más:',
    '{',
    '  "nombre": "nombre del plato",',
    '  "ingredientes": [',
    '    { "nombre": "ingrediente", "rol": "proteina|base|vegetal|grasa|lacteo|aromatico|liquido|toque", "gramos": 200 }',
    '  ],',
    '  "preparacion": "pasos de preparación",',
    '  "tiempo_prep": 25,',
    '  "tip": "consejo breve"',
    '}',
  ].filter(Boolean).join('\n');
}
