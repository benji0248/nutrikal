-- NutriKal: Base tables required before 001_create_tables.sql
-- Run this FIRST in Supabase SQL Editor, then run 001_create_tables.sql

-- ═══════════════════════════════════════════════════════════════
-- 1. users (auth)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (lower(username));
CREATE INDEX IF NOT EXISTS idx_users_email ON users (lower(email));

-- ═══════════════════════════════════════════════════════════════
-- 2. user_data (legacy blob sync — used during migration)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_data (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 3. app_config
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO app_config (key, value)
VALUES ('max_users', '30')
ON CONFLICT (key) DO NOTHING;
