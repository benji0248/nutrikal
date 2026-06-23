-- Add measurement preference to user_settings (run if table already exists without use_grams)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS use_grams BOOLEAN DEFAULT FALSE;
