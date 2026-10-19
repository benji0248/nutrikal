BEGIN;
CREATE TABLE public.nutrikal_mcp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  secret_hash text NOT NULL UNIQUE,
  can_propose boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  UNIQUE(id, user_id)
);
CREATE INDEX nutrikal_mcp_tokens_user_created ON public.nutrikal_mcp_tokens(user_id, created_at DESC);
CREATE TABLE public.nutrikal_mcp_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('apply','undo')),
  target_id uuid NOT NULL,
  calendar_version text NOT NULL,
  review jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE(user_id,token_id,kind,target_id),
  FOREIGN KEY(token_id,user_id) REFERENCES public.nutrikal_mcp_tokens(id,user_id) ON DELETE CASCADE
);
CREATE INDEX nutrikal_mcp_reviews_user_created ON public.nutrikal_mcp_reviews(user_id, created_at DESC);
ALTER TABLE public.nutrikal_mcp_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrikal_mcp_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nutrikal_mcp_tokens, public.nutrikal_mcp_reviews FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.nutrikal_mcp_tokens TO service_role;
GRANT SELECT, INSERT ON public.nutrikal_mcp_reviews TO service_role;
-- Remove default privileges too: proposals and reviews are immutable after insertion.
REVOKE ALL ON public.nutrikal_proposals, public.nutrikal_previews FROM service_role;
GRANT SELECT, INSERT ON public.nutrikal_proposals, public.nutrikal_previews TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
