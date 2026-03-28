import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';
import { getGeminiClient, SYSTEM_PROMPT } from '../_lib/gemini.js';
import { checkRateLimit } from '../_lib/rateLimit.js';

interface ChatRequestBody {
  message: string;
  context: {
    profile: {
      name: string;
      goal: string;
      restrictions: string[];
      dislikedIds: string[];
      dailyBudget: number;
    };
    catalog: string;
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

    // Build contextual prompt
    const contextParts: string[] = [];

    // Profile context
    const { profile } = body.context;
    contextParts.push(`PERFIL DEL USUARIO:
- Nombre: ${profile.name}
- Objetivo: ${profile.goal}
- Restricciones: ${profile.restrictions.length > 0 ? profile.restrictions.join(', ') : 'ninguna'}
- Ingredientes que no le gustan (IDs): ${profile.dislikedIds.length > 0 ? profile.dislikedIds.join(', ') : 'ninguno'}
- Presupuesto diario interno (NUNCA mencionar): ${profile.dailyBudget} kcal`);

    // Today date
    contextParts.push(`FECHA DE HOY: ${body.context.todayDate}`);

    // Week dates for planning
    if (body.context.weekDates) {
      contextParts.push(`FECHAS DE LA SEMANA A PLANIFICAR: ${body.context.weekDates.join(', ')}`);
    }

    // Catalog
    if (body.context.catalog) {
      contextParts.push(`CATÁLOGO DE PLATOS (formato: id:nombre|categoría|tags|kcalAprox):\n${body.context.catalog}`);
    }

    // Today plan
    if (body.context.todayPlan) {
      contextParts.push(`PLAN DE HOY:\n${JSON.stringify(body.context.todayPlan)}`);
    }

    // Week summary
    if (body.context.weekSummary) {
      contextParts.push(`RESUMEN DE LA SEMANA:\n${body.context.weekSummary}`);
    }

    // Preferences for planning
    if (body.context.preferences) {
      const p = body.context.preferences;
      contextParts.push(`PREFERENCIAS PARA EL PLAN:
- Variedad: ${p.variety}
- Tiempo de cocina: ${p.cookingTime}
- Presupuesto: ${p.budget}`);
    }

    const fullSystemPrompt = SYSTEM_PROMPT + '\n\n' + contextParts.join('\n\n');

    // Build conversation history for Gemini
    const history = (body.context.conversationHistory || []).map((msg) => ({
      role: msg.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: msg.text }],
    }));

    // Call Gemini
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-001',
      systemInstruction: fullSystemPrompt,
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(body.message);
    const responseText = result.response.text();

    // Parse JSON response from Gemini
    let parsed: { text: string; actions: unknown[] };
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
