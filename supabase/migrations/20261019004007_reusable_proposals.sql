BEGIN;
CREATE TABLE public.nutrikal_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  request_id text NOT NULL CHECK (length(request_id) BETWEEN 1 AND 150),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  validation jsonb NOT NULL CHECK (jsonb_typeof(validation) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, request_id),
  UNIQUE(id, user_id)
);
CREATE INDEX nutrikal_proposals_user_created ON public.nutrikal_proposals(user_id, created_at DESC);
CREATE TABLE public.nutrikal_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL,
  proposal jsonb NOT NULL,
  context_hash text NOT NULL,
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  review jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  FOREIGN KEY(proposal_id, user_id) REFERENCES public.nutrikal_proposals(id, user_id) ON DELETE CASCADE
);
CREATE INDEX nutrikal_previews_user_created ON public.nutrikal_previews(user_id, created_at DESC);
ALTER TABLE public.nutrikal_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrikal_previews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nutrikal_proposals, public.nutrikal_previews FROM PUBLIC, anon, authenticated;
-- The application verifies its own JWT and supplies user_id; browsers never access these tables.
GRANT SELECT, INSERT ON public.nutrikal_proposals, public.nutrikal_previews TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
