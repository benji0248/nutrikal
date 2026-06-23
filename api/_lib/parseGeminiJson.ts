/**
 * Parsea respuestas JSON de Gemini (fences, texto extra, comas finales, comillas tipográficas).
 */
export function parseGeminiJson<T = unknown>(raw: string): T {
  const candidates = buildJsonCandidates(raw);
  let lastError: Error | undefined;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('No JSON válido en la respuesta del modelo');
}

function buildJsonCandidates(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (s: string) => {
    const t = s.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  const stripped = stripCodeFences(raw);
  push(stripped);
  push(stripTrailingCommas(stripped));
  push(normalizeQuotes(stripped));
  push(stripTrailingCommas(normalizeQuotes(stripped)));

  const extracted = extractOutermostJson(stripped);
  if (extracted) {
    push(extracted);
    push(stripTrailingCommas(extracted));
    push(normalizeQuotes(extracted));
    push(stripTrailingCommas(normalizeQuotes(extracted)));
  }

  return out;
}

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function normalizeQuotes(text: string): string {
  return text
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function stripTrailingCommas(text: string): string {
  return text.replace(/,\s*([}\]])/g, '$1');
}

/** Extrae el primer objeto o array JSON balanceado (respeta strings). */
function extractOutermostJson(text: string): string | null {
  const startObj = text.indexOf('{');
  const startArr = text.indexOf('[');
  let start = -1;
  if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr);
  else start = startObj >= 0 ? startObj : startArr;
  if (start < 0) return null;

  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}
