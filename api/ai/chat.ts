import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';
import { getGeminiClient, SYSTEM_RULES } from '../_lib/gemini.js';
import { checkRateLimit } from '../_lib/rateLimit.js';

interface ChatRequestBody {
  message: string;
  context: {
    profile: {
      name: string;
      goal: string;
      restrictions: string[];
      dislikedIds: string[];
      dislikedNames: string[];
      dislikedCategories: string[];
      allowedExceptionNames: string[];
      dailyBudget: number;
      nationality?: string;
      sex?: string;
      heightCm?: number;
      weightKg?: number;
      age?: number;
    };
    todayPlan: unknown | null;
    weekSummary: string | null;
    conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
    todayDate: string;
    weekDates: string[] | null;
    preferences: {
      variety: string;
      cookingTime: string;
      budget: string;
    } | null;
  };
}

const GOAL_TEXT: Record<string, string> = {
  lose: 'perder peso de forma saludable',
  maintain: 'mantener su peso actual',
  gain: 'ganar masa muscular',
};

const RESTRICTION_TEXT: Record<string, string> = {
  vegetarian: 'vegetariano (sin carne ni pescado)',
  vegan: 'vegano (sin productos animales)',
  gluten_free: 'sin gluten (celíaco)',
  lactose_free: 'sin lácteos',
  low_sodium: 'bajo en sodio',
  diabetic: 'apto para diabéticos (bajo índice glucémico)',
};

function buildPersonalizedPrompt(profile: ChatRequestBody['context']['profile']): string {
  const name = profile.name || 'el usuario';
  const nationality = profile.nationality ?? 'Argentina';
  const goalText = GOAL_TEXT[profile.goal] ?? 'mantener su peso actual';

  const restrictions = profile.restrictions.length > 0
    ? profile.restrictions.map((r) => RESTRICTION_TEXT[r] || r).join(', ')
    : 'ninguna';

  const dislikedList = profile.dislikedNames?.length > 0
    ? profile.dislikedNames
    : profile.dislikedIds;

  // Build disliked text with categories + exceptions
  const dislikedParts: string[] = [];
  const categories = profile.dislikedCategories ?? [];
  const exceptions = profile.allowedExceptionNames ?? [];
  for (const cat of categories) {
    if (exceptions.length > 0) {
      dislikedParts.push(`${cat} en general (EXCEPTO ${exceptions.join(', ')} que sí le gustan)`);
    } else {
      dislikedParts.push(`${cat} (todos)`);
    }
  }
  if (dislikedList.length > 0) {
    dislikedParts.push(dislikedList.join(', '));
  }
  const disliked = dislikedParts.length > 0 ? dislikedParts.join('; ') : 'ninguno';

  const physicalLines: string[] = [];
  if (profile.sex) physicalLines.push(`Sexo biológico: ${profile.sex === 'male' ? 'masculino' : 'femenino'}`);
  if (profile.age) physicalLines.push(`Edad: ${profile.age} años`);
  if (profile.heightCm) physicalLines.push(`Altura: ${profile.heightCm} cm`);
  if (profile.weightKg) physicalLines.push(`Peso: ${profile.weightKg} kg`);

  // Determine language style based on nationality
  const isVoseo = ['Argentina', 'Uruguay', 'Paraguay', 'Costa Rica', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua'].includes(nationality);
  const langStyle = isVoseo
    ? `Hablá en español con voseo (vos, hacé, dale, bárbaro). Usá modismos de ${nationality}.`
    : `Hablá en español con tuteo (tú, haz). Usá modismos de ${nationality}.`;

  return `Sos el nutricionista personal de NutriKal para ${name}, de ${nationality}.

PERSONALIDAD:
- ${langStyle}
- Cálido, cercano, conciso. Nunca juzgás. Si alguien tiene ansiedad o comió de más, lo contenés.
- Mensajes CORTOS: 1-3 oraciones máximo. No expliques de más.

DATOS DE ${name.toUpperCase()}:
${physicalLines.length > 0 ? physicalLines.map((l) => `- ${l}`).join('\n') + '\n' : ''}- Restricciones: ${restrictions}
- A ${name} NO le gustan estos ingredientes (NUNCA los incluyas en ninguna comida): ${disliked}

PRESUPUESTO CALÓRICO — REGLA CRÍTICA:
- DÍAS NORMALES (lunes a sábado): el presupuesto es EXACTAMENTE ${profile.dailyBudget} kcal. YA incluye el ajuste por su objetivo. NO lo modifiques, NO le restes nada.
  Distribución: ~25% desayuno (~${Math.round(profile.dailyBudget * 0.25)} kcal), ~35% almuerzo (~${Math.round(profile.dailyBudget * 0.35)} kcal), ~30% cena (~${Math.round(profile.dailyBudget * 0.30)} kcal), ~10% snack (~${Math.round(profile.dailyBudget * 0.10)} kcal).
- DOMINGO = CHEAT DAY: el presupuesto del domingo es ${profile.dailyBudget + 1000} kcal (budget normal + 1000). Ese día podés incluir comidas más indulgentes, porciones más grandes, postres, etc.
  Distribución domingo: ~25% desayuno (~${Math.round((profile.dailyBudget + 1000) * 0.25)} kcal), ~35% almuerzo (~${Math.round((profile.dailyBudget + 1000) * 0.35)} kcal), ~30% cena (~${Math.round((profile.dailyBudget + 1000) * 0.30)} kcal), ~10% snack (~${Math.round((profile.dailyBudget + 1000) * 0.10)} kcal).
NUNCA mencionés calorías al usuario.

REGLAS DE PLANIFICACIÓN PARA ${name.toUpperCase()}:
- Priorizá comidas típicas de ${nationality}.
- Balanceá las comidas: proteína repartida, no todos carbos juntos.
- Variá: no repitas el mismo plato más de 2 veces en la semana.
- Respetá las restricciones de ${name} absolutamente.
- Excluí ingredientes que no le gustan.
- El plan debe incluir los 4 slots (desayuno, almuerzo, cena, snack) para cada día.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Auth
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization' });
    }

    let userId: string;
    try {
      const payload = verifyToken(authHeader.slice(7));
      userId = payload.sub;
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Rate limit
    const rateResult = await checkRateLimit(userId);
    if (!rateResult.allowed) {
      return res.status(429).json({
        error: 'rate_limit',
        text: '¡Uy! Ya usaste todos tus mensajes de hoy. Volvé mañana para seguir charlando.',
        remaining: 0,
      });
    }

    const body = req.body as ChatRequestBody;
    if (!body.message || !body.context) {
      return res.status(400).json({ error: 'Missing message or context' });
    }

    // Build personalized system prompt
    const personalizedPrompt = buildPersonalizedPrompt(body.context.profile);

    // Build situational context
    const contextParts: string[] = [];

    contextParts.push(`FECHA DE HOY: ${body.context.todayDate}`);

    if (body.context.weekDates) {
      const dates = body.context.weekDates;
      const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const datesWithDay = dates.map((d) => {
        const dayName = daysOfWeek[new Date(d + 'T12:00:00').getDay()];
        const isCheat = dayName === 'domingo';
        return `${d} (${dayName}${isCheat ? ' — CHEAT DAY' : ''})`;
      });
      contextParts.push(`FECHAS DE LA SEMANA A PLANIFICAR (${dates.length} días):
${datesWithDay.join('\n')}
OBLIGATORIO: el array "days" DEBE tener exactamente ${dates.length} objetos, uno por cada fecha. NO generes solo 1 día.`);
    }

    if (body.context.todayPlan) {
      contextParts.push(`PLAN DE HOY:\n${JSON.stringify(body.context.todayPlan)}`);
    }

    if (body.context.weekSummary) {
      contextParts.push(`RESUMEN DE LA SEMANA:\n${body.context.weekSummary}`);
    }

    if (body.context.preferences) {
      const p = body.context.preferences;
      contextParts.push(`PREFERENCIAS PARA EL PLAN:
- Variedad: ${p.variety}
- Tiempo de cocina: ${p.cookingTime}
- Presupuesto: ${p.budget}`);
    }

    const fullSystemPrompt = personalizedPrompt + '\n\n' + SYSTEM_RULES + '\n\n' + contextParts.join('\n\n');

    // Build conversation history for Gemini
    const history = (body.context.conversationHistory || []).map((msg) => ({
      role: msg.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: msg.text }],
    }));

    // Call Gemini
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      systemInstruction: fullSystemPrompt,
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(body.message);
    const responseText = result.response.text();

    // Parse JSON response from Gemini
    let parsed: { text: string; actions: unknown[]; quickReplies?: string[] };
    try {
      // Strip markdown code fences if present
      const cleaned = responseText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If Gemini didn't respond with valid JSON, wrap the text
      parsed = { text: responseText, actions: [] };
    }

    return res.status(200).json({
      text: parsed.text,
      actions: parsed.actions || [],
      quickReplies: parsed.quickReplies || [],
      remaining: rateResult.remaining,
    });
  } catch (err) {
    console.error('AI chat error:', err);
    return res.status(500).json({
      error: 'internal',
      text: 'Algo salió mal. Intentá de nuevo en unos segundos.',
    });
  }
}
