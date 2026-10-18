-- Atomic calendar plan operations. No existing meal is deleted by this migration.
BEGIN;
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS plan_id text;
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS option_id text;
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS is_alternative boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_meals_plan ON public.meals(user_id, plan_id);

CREATE TABLE IF NOT EXISTS public.calendar_plans (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date text NOT NULL,
  end_date text NOT NULL,
  created_at text NOT NULL,
  source jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_calendar_plans_user ON public.calendar_plans(user_id);
CREATE TABLE IF NOT EXISTS public.calendar_operations (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  undone_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_calendar_operations_user ON public.calendar_operations(user_id, created_at DESC);
ALTER TABLE public.calendar_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calendar_plans, public.calendar_operations FROM anon, authenticated;
GRANT ALL ON public.calendar_plans, public.calendar_operations TO service_role;

-- All writes (including the legacy meal/shopping endpoints) share the same lock.
CREATE OR REPLACE FUNCTION public.lock_calendar_user() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(OLD.user_id::text, 7204));
    RETURN OLD;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 7204));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS calendar_user_lock ON public.meals;
CREATE TRIGGER calendar_user_lock BEFORE INSERT OR UPDATE OR DELETE ON public.meals FOR EACH ROW EXECUTE FUNCTION public.lock_calendar_user();
DROP TRIGGER IF EXISTS calendar_user_lock ON public.shopping_lists;
CREATE TRIGGER calendar_user_lock BEFORE INSERT OR UPDATE OR DELETE ON public.shopping_lists FOR EACH ROW EXECUTE FUNCTION public.lock_calendar_user();
DROP TRIGGER IF EXISTS calendar_user_lock ON public.shopping_items;
CREATE TRIGGER calendar_user_lock BEFORE INSERT OR UPDATE OR DELETE ON public.shopping_items FOR EACH ROW EXECUTE FUNCTION public.lock_calendar_user();

CREATE OR REPLACE FUNCTION public.calendar_snapshot(p_user_id uuid) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'meals', COALESCE((SELECT jsonb_agg(to_jsonb(m) - 'user_id' - 'created_at' ORDER BY m.id) FROM meals m WHERE m.user_id = p_user_id), '[]'::jsonb),
    'plans', COALESCE((SELECT jsonb_agg(to_jsonb(p) - 'user_id' ORDER BY p.id) FROM calendar_plans p WHERE p.user_id = p_user_id), '[]'::jsonb),
    'lists', COALESCE((SELECT jsonb_agg(to_jsonb(l) - 'user_id' ORDER BY l.id) FROM shopping_lists l WHERE l.user_id = p_user_id), '[]'::jsonb),
    'items', COALESCE((SELECT jsonb_agg(to_jsonb(i) - 'user_id' ORDER BY i.id) FROM shopping_items i WHERE i.user_id = p_user_id), '[]'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.commit_calendar_operation(
  p_user_id uuid, p_before jsonb, p_after jsonb, p_operation_id text, p_undo_of text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_state jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 7204));
  IF EXISTS (SELECT 1 FROM calendar_operations WHERE id = p_operation_id AND user_id = p_user_id) THEN
    RETURN calendar_snapshot(p_user_id);
  END IF;
  current_state := calendar_snapshot(p_user_id);
  IF current_state IS DISTINCT FROM p_before THEN
    RAISE EXCEPTION 'CALENDAR_CHANGED' USING ERRCODE = '40001';
  END IF;
  IF p_undo_of IS NOT NULL THEN
    UPDATE calendar_operations SET undone_by = p_operation_id
      WHERE id = p_undo_of AND user_id = p_user_id AND undone_by IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'ALREADY_UNDONE'; END IF;
  END IF;
  -- Never allow a payload to take over IDs owned by another account.
  IF EXISTS (SELECT 1 FROM meals m JOIN jsonb_array_elements(p_after->'meals') j ON m.id = j->>'id' WHERE m.user_id <> p_user_id)
    OR EXISTS (SELECT 1 FROM calendar_plans p JOIN jsonb_array_elements(p_after->'plans') j ON p.id = j->>'id' WHERE p.user_id <> p_user_id)
    OR EXISTS (SELECT 1 FROM shopping_lists l JOIN jsonb_array_elements(p_after->'lists') j ON l.id = j->>'id' WHERE l.user_id <> p_user_id)
    OR EXISTS (SELECT 1 FROM shopping_items i JOIN jsonb_array_elements(p_after->'items') j ON i.id = j->>'id' WHERE i.user_id <> p_user_id)
  THEN RAISE EXCEPTION 'INVALID_OWNER'; END IF;

  DELETE FROM meals WHERE user_id = p_user_id AND id NOT IN (SELECT j->>'id' FROM jsonb_array_elements(p_after->'meals') j);
  INSERT INTO meals (id,user_id,date,meal_type,name,calories,notes,linked_recipe_id,entries,ai_ingredients,completed,prep_minutes,human_portion,preparation,tip,plan_id,option_id,is_alternative)
    SELECT id,p_user_id,date,meal_type,name,calories,notes,linked_recipe_id,entries,ai_ingredients,completed,prep_minutes,human_portion,preparation,tip,plan_id,option_id,COALESCE(is_alternative,false)
    FROM jsonb_populate_recordset(NULL::meals, p_after->'meals')
    ON CONFLICT (id) DO UPDATE SET date=EXCLUDED.date,meal_type=EXCLUDED.meal_type,name=EXCLUDED.name,calories=EXCLUDED.calories,notes=EXCLUDED.notes,linked_recipe_id=EXCLUDED.linked_recipe_id,entries=EXCLUDED.entries,ai_ingredients=EXCLUDED.ai_ingredients,completed=EXCLUDED.completed,prep_minutes=EXCLUDED.prep_minutes,human_portion=EXCLUDED.human_portion,preparation=EXCLUDED.preparation,tip=EXCLUDED.tip,plan_id=EXCLUDED.plan_id,option_id=EXCLUDED.option_id,is_alternative=EXCLUDED.is_alternative WHERE meals.user_id = p_user_id;
  DELETE FROM calendar_plans WHERE user_id = p_user_id AND id NOT IN (SELECT j->>'id' FROM jsonb_array_elements(p_after->'plans') j);
  INSERT INTO calendar_plans (id,user_id,title,start_date,end_date,created_at,source)
    SELECT id,p_user_id,title,start_date,end_date,created_at,source FROM jsonb_populate_recordset(NULL::calendar_plans,p_after->'plans')
    ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,start_date=EXCLUDED.start_date,end_date=EXCLUDED.end_date,source=EXCLUDED.source WHERE calendar_plans.user_id = p_user_id;
  DELETE FROM shopping_items WHERE user_id = p_user_id AND id NOT IN (SELECT j->>'id' FROM jsonb_array_elements(p_after->'items') j);
  DELETE FROM shopping_lists WHERE user_id = p_user_id AND id NOT IN (SELECT j->>'id' FROM jsonb_array_elements(p_after->'lists') j);
  INSERT INTO shopping_lists (id,user_id,name,created_at,date_from,date_to)
    SELECT id,p_user_id,name,created_at,date_from,date_to FROM jsonb_populate_recordset(NULL::shopping_lists,p_after->'lists')
    ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,date_from=EXCLUDED.date_from,date_to=EXCLUDED.date_to WHERE shopping_lists.user_id = p_user_id;
  INSERT INTO shopping_items (id,user_id,list_id,ingredient_id,name,quantity,section,checked)
    SELECT id,p_user_id,list_id,ingredient_id,name,quantity,section,checked FROM jsonb_populate_recordset(NULL::shopping_items,p_after->'items')
    ON CONFLICT (id) DO UPDATE SET list_id=EXCLUDED.list_id,ingredient_id=EXCLUDED.ingredient_id,name=EXCLUDED.name,quantity=EXCLUDED.quantity,section=EXCLUDED.section,checked=EXCLUDED.checked WHERE shopping_items.user_id = p_user_id;
  INSERT INTO calendar_operations(id,user_id,before_state,after_state) VALUES(p_operation_id,p_user_id,p_before,calendar_snapshot(p_user_id));
  RETURN calendar_snapshot(p_user_id);
END;
$$;
REVOKE ALL ON FUNCTION public.calendar_snapshot(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_calendar_operation(uuid,jsonb,jsonb,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calendar_snapshot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_calendar_operation(uuid,jsonb,jsonb,text,text) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
