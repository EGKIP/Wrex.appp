-- Wrex.app Supabase hardening follow-up
-- Apply in Supabase SQL editor or through your migration workflow after review.
-- This script is idempotent and focuses on advisor findings seen on 2026-06-05.

begin;

-- Restrict SECURITY DEFINER RPCs and harden search_path.
alter function public.handle_new_user()
  set search_path = public, auth;
alter function public.handle_new_user_profile()
  set search_path = public, auth;
alter function public.handle_new_user_welcome_email()
  set search_path = public, auth;
alter function public.wrex_get_or_create_ai_credit_balance(uuid, date, date, integer)
  set search_path = public;
alter function public.wrex_debit_ai_credits(uuid, text, text, text, integer, integer, integer, integer, date, date, integer)
  set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_user_profile() from public, anon, authenticated;
revoke execute on function public.handle_new_user_welcome_email() from public, anon, authenticated;
revoke execute on function public.wrex_get_or_create_ai_credit_balance(uuid, date, date, integer) from public, anon, authenticated;
revoke execute on function public.wrex_debit_ai_credits(uuid, text, text, text, integer, integer, integer, integer, date, date, integer) from public, anon, authenticated;

grant execute on function public.handle_new_user() to service_role;
grant execute on function public.handle_new_user_profile() to service_role;
grant execute on function public.handle_new_user_welcome_email() to service_role;
grant execute on function public.wrex_get_or_create_ai_credit_balance(uuid, date, date, integer) to service_role;
grant execute on function public.wrex_debit_ai_credits(uuid, text, text, text, integer, integer, integer, integer, date, date, integer) to service_role;

-- Cover the foreign key flagged by the performance advisor.
create index if not exists ai_credit_events_user_id_idx
  on public.ai_credit_events (user_id);

-- Reduce per-row auth function re-evaluation in RLS policies.
drop policy if exists "Users can insert own usage logs" on public.usage_logs;
create policy "Users can insert own usage logs"
  on public.usage_logs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read own usage logs" on public.usage_logs;
create policy "Users can read own usage logs"
  on public.usage_logs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own submissions" on public.submissions;
create policy "Users can insert own submissions"
  on public.submissions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read own submissions" on public.submissions;
create policy "Users can read own submissions"
  on public.submissions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own submissions" on public.submissions;
create policy "Users can delete own submissions"
  on public.submissions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can read own AI credit periods" on public.ai_credit_periods;
create policy "Users can read own AI credit periods"
  on public.ai_credit_periods
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own AI credit events" on public.ai_credit_events;
create policy "Users can read own AI credit events"
  on public.ai_credit_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

commit;
