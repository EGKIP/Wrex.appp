-- Wrex Pro AI credit foundation.
--
-- Credits are one-to-one with OpenAI total_tokens. The backend calls these RPCs
-- with the service-role key, so RLS policies are mostly for future direct reads.

create extension if not exists pgcrypto;

create table if not exists public.ai_credit_periods (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  monthly_credits integer not null check (monthly_credits >= 0),
  used_credits integer not null default 0 check (used_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

create table if not exists public.ai_credit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null unique,
  endpoint text not null,
  model text not null,
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  credits_debited integer not null check (credits_debited >= 0),
  period_start date not null,
  created_at timestamptz not null default now()
);

alter table public.ai_credit_periods enable row level security;
alter table public.ai_credit_events enable row level security;

drop policy if exists "Users can read own AI credit periods" on public.ai_credit_periods;
create policy "Users can read own AI credit periods"
  on public.ai_credit_periods
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own AI credit events" on public.ai_credit_events;
create policy "Users can read own AI credit events"
  on public.ai_credit_events
  for select
  using (auth.uid() = user_id);

create or replace function public.set_ai_credit_period_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_credit_periods_set_updated_at on public.ai_credit_periods;
create trigger ai_credit_periods_set_updated_at
before update on public.ai_credit_periods
for each row execute function public.set_ai_credit_period_updated_at();

create or replace function public.wrex_get_or_create_ai_credit_balance(
  p_user_id uuid,
  p_period_start date,
  p_period_end date,
  p_monthly_credits integer
)
returns table (
  monthly_credits integer,
  remaining_credits integer,
  period_start date,
  period_end date
)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ai_credit_periods (
    user_id,
    period_start,
    period_end,
    monthly_credits,
    used_credits
  )
  values (
    p_user_id,
    p_period_start,
    p_period_end,
    p_monthly_credits,
    0
  )
  on conflict (user_id, period_start) do update
  set
    period_end = excluded.period_end,
    monthly_credits = excluded.monthly_credits;

  return query
  select
    p.monthly_credits,
    greatest(p.monthly_credits - p.used_credits, 0) as remaining_credits,
    p.period_start,
    p.period_end
  from public.ai_credit_periods p
  where p.user_id = p_user_id
    and p.period_start = p_period_start;
end;
$$;

create or replace function public.wrex_debit_ai_credits(
  p_user_id uuid,
  p_request_id text,
  p_endpoint text,
  p_model text,
  p_prompt_tokens integer,
  p_completion_tokens integer,
  p_total_tokens integer,
  p_credits integer,
  p_period_start date,
  p_period_end date,
  p_monthly_credits integer
)
returns table (
  monthly_credits integer,
  remaining_credits integer,
  period_start date,
  period_end date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_credits integer;
begin
  perform *
  from public.wrex_get_or_create_ai_credit_balance(
    p_user_id,
    p_period_start,
    p_period_end,
    p_monthly_credits
  );

  insert into public.ai_credit_events (
    user_id,
    request_id,
    endpoint,
    model,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    credits_debited,
    period_start
  )
  values (
    p_user_id,
    p_request_id,
    p_endpoint,
    p_model,
    greatest(p_prompt_tokens, 0),
    greatest(p_completion_tokens, 0),
    greatest(p_total_tokens, 0),
    greatest(p_credits, 0),
    p_period_start
  )
  on conflict (request_id) do nothing
  returning credits_debited into inserted_credits;

  if inserted_credits is not null and inserted_credits > 0 then
    update public.ai_credit_periods
    set used_credits = used_credits + inserted_credits
    where user_id = p_user_id
      and period_start = p_period_start;
  end if;

  return query
  select
    p.monthly_credits,
    greatest(p.monthly_credits - p.used_credits, 0) as remaining_credits,
    p.period_start,
    p.period_end
  from public.ai_credit_periods p
  where p.user_id = p_user_id
    and p.period_start = p_period_start;
end;
$$;

grant execute on function public.wrex_get_or_create_ai_credit_balance(uuid, date, date, integer) to service_role;
grant execute on function public.wrex_debit_ai_credits(uuid, text, text, text, integer, integer, integer, integer, date, date, integer) to service_role;
