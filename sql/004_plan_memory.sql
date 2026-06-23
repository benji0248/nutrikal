-- Memoria de rotación (platos a evitar + generación de canasta)

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS plan_memory JSONB;
