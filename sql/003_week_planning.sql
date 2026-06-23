-- Week planning preferences + meal recipe fields (run after 001/002)

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS week_planning JSONB;

ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS prep_minutes INTEGER;

ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS human_portion TEXT;

ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS preparation TEXT;

ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS tip TEXT;
