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
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const tables = ['users', 'user_profiles', 'user_data', 'app_config'];
let failed = false;

for (const table of tables) {
  const { error } = await supabase.from(table).select('*').limit(1);
  if (error) {
    console.log(`${table}: ERROR ${error.code} — ${error.message}`);
    failed = true;
  } else {
    console.log(`${table}: OK`);
  }
}

process.exit(failed ? 1 : 0);
