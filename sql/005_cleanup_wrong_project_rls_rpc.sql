-- NutriKal: cleanup for an accidentally executed RLS/RPC script from another project.
--
-- This script removes only the helper/RPC functions and policies created by that
-- script. It is intentionally idempotent and safe to run even if the original
-- script failed halfway through.
--
-- Important: this does NOT disable RLS on any table. If one of the foreign
-- tables actually exists and the wrong script enabled RLS on it, review that
-- table manually before changing its RLS state.

-- =============================================================================
-- Drop foreign RPC/helper functions
-- =============================================================================

DROP FUNCTION IF EXISTS public.ensure_recurring_expenses();
DROP FUNCTION IF EXISTS public.set_shared_cash(BOOLEAN);
DROP FUNCTION IF EXISTS public.invite_household_member(TEXT);
DROP FUNCTION IF EXISTS public.transfer_funds(INTEGER, INTEGER, DECIMAL);
DROP FUNCTION IF EXISTS public.adjust_account_balance(INTEGER, DECIMAL);
DROP FUNCTION IF EXISTS public.complete_expense(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.pay_expense(INTEGER, DECIMAL, INTEGER);
DROP FUNCTION IF EXISTS public.get_expenses_month_summary(INT, INT);
DROP FUNCTION IF EXISTS public.can_access_expense(INTEGER);
DROP FUNCTION IF EXISTS public.can_access_account(INTEGER);
DROP FUNCTION IF EXISTS public.my_shared_cash();
DROP FUNCTION IF EXISTS public.my_visible_user_ids();
DROP FUNCTION IF EXISTS public.my_household_id();

-- =============================================================================
-- Drop foreign policies, only if the target table exists
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    DROP POLICY IF EXISTS expenses_select ON public.expenses;
    DROP POLICY IF EXISTS expenses_insert ON public.expenses;
    DROP POLICY IF EXISTS expenses_update ON public.expenses;
    DROP POLICY IF EXISTS expenses_delete ON public.expenses;
  END IF;

  IF to_regclass('public.accounts') IS NOT NULL THEN
    DROP POLICY IF EXISTS accounts_select ON public.accounts;
    DROP POLICY IF EXISTS accounts_insert ON public.accounts;
    DROP POLICY IF EXISTS accounts_update ON public.accounts;
    DROP POLICY IF EXISTS accounts_delete ON public.accounts;
  END IF;

  IF to_regclass('public.categories') IS NOT NULL THEN
    DROP POLICY IF EXISTS categories_select ON public.categories;
    DROP POLICY IF EXISTS categories_insert ON public.categories;
    DROP POLICY IF EXISTS categories_update ON public.categories;
    DROP POLICY IF EXISTS categories_delete ON public.categories;
  END IF;

  IF to_regclass('public.credit_card_statements') IS NOT NULL THEN
    DROP POLICY IF EXISTS statements_select ON public.credit_card_statements;
    DROP POLICY IF EXISTS statements_insert ON public.credit_card_statements;
    DROP POLICY IF EXISTS statements_update ON public.credit_card_statements;
    DROP POLICY IF EXISTS statements_delete ON public.credit_card_statements;
  END IF;

  IF to_regclass('public.households') IS NOT NULL THEN
    DROP POLICY IF EXISTS households_select ON public.households;
    DROP POLICY IF EXISTS households_insert ON public.households;
    DROP POLICY IF EXISTS households_update ON public.households;
  END IF;

  IF to_regclass('public.household_members') IS NOT NULL THEN
    DROP POLICY IF EXISTS household_members_select ON public.household_members;
    DROP POLICY IF EXISTS household_members_insert ON public.household_members;
    DROP POLICY IF EXISTS household_members_update ON public.household_members;
    DROP POLICY IF EXISTS household_members_delete ON public.household_members;
  END IF;

  IF to_regclass('public.household_invites') IS NOT NULL THEN
    DROP POLICY IF EXISTS household_invites_select ON public.household_invites;
    DROP POLICY IF EXISTS household_invites_insert ON public.household_invites;
    DROP POLICY IF EXISTS household_invites_update ON public.household_invites;
  END IF;

  IF to_regclass('public.household_recurring_expenses') IS NOT NULL THEN
    DROP POLICY IF EXISTS recurring_select ON public.household_recurring_expenses;
    DROP POLICY IF EXISTS recurring_insert ON public.household_recurring_expenses;
    DROP POLICY IF EXISTS recurring_update ON public.household_recurring_expenses;
    DROP POLICY IF EXISTS recurring_delete ON public.household_recurring_expenses;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP POLICY IF EXISTS profiles_select_household ON public.profiles;
  END IF;
END $$;

-- Refresh PostgREST so removed RPCs disappear from the API schema cache.
NOTIFY pgrst, 'reload schema';
