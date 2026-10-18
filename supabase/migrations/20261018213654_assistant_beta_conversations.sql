begin;

-- Separate pilot history. Existing conversations, meals and preferences are untouched.
create table public.assistant_beta_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'Nueva conversación' check (length(title) <= 64),
  messages jsonb not null default '[]'::jsonb
    check (jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) <= 60),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assistant_beta_conversations_user_updated_idx
  on public.assistant_beta_conversations (user_id, updated_at desc);

alter table public.assistant_beta_conversations enable row level security;
revoke all on public.assistant_beta_conversations from public, anon, authenticated;
grant select, insert, update on public.assistant_beta_conversations to service_role;
comment on table public.assistant_beta_conversations is
  'Pilot assistant history. Server verifies its own JWT and allowlist; no direct browser access.';

notify pgrst, 'reload schema';
commit;
