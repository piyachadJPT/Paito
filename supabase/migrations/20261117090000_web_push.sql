-- Web Push: alerts reach the iPhone even when the app is closed.
-- pg_cron calls /api/push/tick every minute; the route computes due alerts
-- with lib/schedule and sends them to every subscribed device.

-- ---------------------------------------------------------------------------
-- Devices (one row per push subscription endpoint)
-- ---------------------------------------------------------------------------
create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  -- The trip this device is following (activeTripId is per device)
  trip_id uuid references public.trips on delete set null,
  -- Keys of stops where the user chose "ออกตามแผน" on this device
  leave_on_plan text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_devices_user on public.push_devices (user_id);
create index push_devices_trip on public.push_devices (trip_id);
create trigger push_devices_set_updated_at before update on public.push_devices
  for each row execute function public.set_updated_at();

revoke all on public.push_devices from anon, authenticated;
grant select, insert, update, delete on public.push_devices to authenticated;
alter table public.push_devices enable row level security;
create policy push_devices_own on public.push_devices for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (trip_id is null or exists (select 1 from public.trips t
                                    where t.id = push_devices.trip_id and t.user_id = (select auth.uid())))
  );

-- ---------------------------------------------------------------------------
-- Sent log: each alert key is pushed once per trip (server only)
-- ---------------------------------------------------------------------------
create table public.push_sent (
  trip_id uuid not null references public.trips on delete cascade,
  alert_key text not null,
  sent_at timestamptz not null default now(),
  primary key (trip_id, alert_key)
);
revoke all on public.push_sent from anon, authenticated;
alter table public.push_sent enable row level security;
-- no policies: only the secret key (server) reads or writes it

-- ---------------------------------------------------------------------------
-- Every minute: POST /api/push/tick
-- Needs two Vault secrets (Dashboard → Project Settings → Vault):
--   push_tick_url  e.g. https://<domain>/api/push/tick
--   cron_secret    same value as CRON_SECRET on Vercel
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

create function public.push_tick() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tick_url text;
  secret text;
begin
  select decrypted_secret into tick_url from vault.decrypted_secrets where name = 'push_tick_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if tick_url is null or secret is null then
    return; -- not configured yet
  end if;
  -- Only when a device is subscribed
  if not exists (select 1 from public.push_devices where trip_id is not null) then
    return;
  end if;
  perform net.http_post(
    url := tick_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end $$;
revoke execute on function public.push_tick() from public, anon, authenticated;

select cron.schedule('paito-push-tick', '* * * * *', 'select public.push_tick()');
