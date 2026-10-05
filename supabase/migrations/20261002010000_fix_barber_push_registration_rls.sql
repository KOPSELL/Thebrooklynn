create or replace function public.register_barber_push_subscription(
  p_barber_id uuid,
  p_onesignal_subscription_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis_barbeiros (barber_id, onesignal_subscription_id)
  values (p_barber_id, p_onesignal_subscription_id)
  on conflict (barber_id) do update
    set onesignal_subscription_id = excluded.onesignal_subscription_id,
        updated_at = now();
end;
$$;

revoke all on function public.register_barber_push_subscription(uuid, text) from public;
grant execute on function public.register_barber_push_subscription(uuid, text) to anon, authenticated;
