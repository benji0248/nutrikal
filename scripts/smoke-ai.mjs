import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = loadEnv('.env.local');
console.log('DEEPSEEK_API_KEY:', env.DEEPSEEK_API_KEY ? 'set' : 'MISSING');
console.log('GEMINI_API_KEY:', env.GEMINI_API_KEY ? 'set' : 'MISSING');

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { error } = await supabase.from('ai_usage').select('*').limit(1);
console.log('ai_usage:', error ? `${error.code} — ${error.message}` : 'OK');
