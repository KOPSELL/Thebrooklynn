-- Ensure the public push-registration flow can create and update the
-- barber subscription row when the frontend uses Supabase upsert().
alter table public.perfis_barbeiros enable row level security;

drop policy if exists "Public can register barber push subscription" on public.perfis_barbeiros;
create policy "Public can register barber push subscription"
  on public.perfis_barbeiros
  for insert
  to anon, authenticated
  with check (
    barber_id is not null
    and onesignal_subscription_id is not null
  );

drop policy if exists "Public can update barber push subscription" on public.perfis_barbeiros;
create policy "Public can update barber push subscription"
  on public.perfis_barbeiros
  for update
  to anon, authenticated
  using (true)
  with check (
    barber_id is not null
    and onesignal_subscription_id is not null
  );

drop policy if exists "Public can read barber push subscription" on public.perfis_barbeiros;
create policy "Public can read barber push subscription"
  on public.perfis_barbeiros
  for select
  to anon, authenticated
  using (true);

grant select, insert, update on table public.perfis_barbeiros to anon, authenticated;
