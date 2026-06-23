-- NutriKal: Migrate from blob-sync to REST API
-- Run 000_base_tables.sql FIRST, then this file in Supabase SQL Editor.
-- All tables use user_id UUID referencing users(id) ON DELETE CASCADE.

-- ═══════════════════════════════════════════════════════════════
-- 1. meals
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,           -- yyyy-MM-dd
  meal_type TEXT NOT NULL,      -- desayuno | almuerzo | cena | snack
  name TEXT NOT NULL,
  calories REAL,
  notes TEXT,
  linked_recipe_id TEXT,
  entries JSONB DEFAULT '[]',
  ai_ingredients JSONB DEFAULT '[]',
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);

-- ═══════════════════════════════════════════════════════════════
-- 2. day_notes
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS day_notes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  notes TEXT DEFAULT '',
  PRIMARY KEY (user_id, date)
);

-- ═══════════════════════════════════════════════════════════════
-- 3. user_profiles
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  sex TEXT NOT NULL,
  height_cm REAL NOT NULL,
  weight_kg REAL NOT NULL,
  activity_level TEXT NOT NULL,
  goal TEXT NOT NULL,
  restrictions JSONB DEFAULT '[]',
  disliked_ingredient_ids JSONB DEFAULT '[]',
  disliked_categories JSONB DEFAULT '[]',
  allowed_exceptions JSONB DEFAULT '[]',
  nationality TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_recalibration TEXT NOT NULL
);

-- ═══════════════════════════════════════════════════════════════
-- 4. notifications
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  time TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  type TEXT NOT NULL,           -- water | meal | custom
  meal_type TEXT               -- nullable, only for meal type
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 5. calculator_recipes
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS calculator_recipes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entries JSONB DEFAULT '[]',
  total_macros JSONB DEFAULT '{}',
  saved_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_calculator_recipes_user ON calculator_recipes(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 6. custom_ingredients
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS custom_ingredients (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  calories REAL NOT NULL,
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fat REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_custom_ingredients_user ON custom_ingredients(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 7. custom_dishes
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS custom_dishes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  ingredients JSONB DEFAULT '[]',
  default_servings INTEGER DEFAULT 1,
  prep_minutes INTEGER DEFAULT 0,
  human_portion TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custom_dishes_user ON custom_dishes(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 8. shopping_lists
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shopping_lists (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user ON shopping_lists(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 9. shopping_items
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity TEXT NOT NULL,
  section TEXT NOT NULL,
  checked BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_shopping_items_list ON shopping_items(list_id);

-- ═══════════════════════════════════════════════════════════════
-- 10. user_settings
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark',
  show_calories BOOLEAN DEFAULT FALSE,
  use_grams BOOLEAN DEFAULT FALSE
);

-- ═══════════════════════════════════════════════════════════════
-- 11. favorites
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, dish_name)
);

-- ═══════════════════════════════════════════════════════════════
-- 12. ingredient_signals
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ingredient_signals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL,
  comida TEXT NOT NULL,
  ingredientes_sugeridos JSONB DEFAULT '[]',
  ingredientes_finales JSONB DEFAULT '[]',
  ingredientes_removidos JSONB DEFAULT '[]',
  ingredientes_agregados JSONB DEFAULT '[]',
  accion TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ingredient_signals_user ON ingredient_signals(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 13. user_migrations
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_migrations (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  migrated_at TIMESTAMPTZ DEFAULT now(),
  blob_backup JSONB
);

-- ═══════════════════════════════════════════════════════════════
-- RLS: enable on all new tables (backend uses service role key)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_migrations ENABLE ROW LEVEL SECURITY;
