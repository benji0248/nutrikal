-- SP-10: historial de check-ins corporales.
-- El backend usa service-role; RLS evita acceso directo accidental desde el cliente.

CREATE TABLE IF NOT EXISTS body_check_ins (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight_kg REAL NOT NULL CHECK (weight_kg > 0),
  period_experience TEXT CHECK (
    period_experience IS NULL
    OR period_experience IN ('easy', 'normal', 'hard')
  ),
  source TEXT NOT NULL CHECK (
    source IN ('onboarding', 'scheduled', 'manual', 'confirmation', 'profile')
  ),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_check_ins_user_recorded
  ON body_check_ins(user_id, recorded_at);

ALTER TABLE body_check_ins ENABLE ROW LEVEL SECURITY;

-- Punto cero para perfiles que ya existían antes de SP-10.
INSERT INTO body_check_ins (user_id, weight_kg, source, recorded_at)
SELECT
  p.user_id,
  p.weight_kg,
  'onboarding',
  COALESCE(NULLIF(p.created_at, '')::timestamptz, now())
FROM user_profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM body_check_ins c
  WHERE c.user_id = p.user_id
);
