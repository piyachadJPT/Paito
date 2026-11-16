-- Initial schema for paito (SPEC §4.1–4.4)

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.stop_type as enum ('sight', 'food', 'rest', 'lodging');
create type public.stop_status as enum ('not_started', 'in_progress', 'completed', 'skipped');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  timezone text not null default 'Asia/Bangkok',
  day_cutoff_hour smallint not null default 4 check (day_cutoff_hour between 0 and 12),
  departure_alert_minutes smallint not null default 15 check (departure_alert_minutes between 0 and 120),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.trip_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  trip_id uuid not null references public.trips on delete cascade,
  day_number smallint not null check (day_number >= 1),
  date date not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, day_number),
  unique (trip_id, date)
);

create table public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  trip_id uuid not null references public.trips on delete cascade,
  trip_day_id uuid not null references public.trip_days on delete cascade,
  sort_order double precision not null,
  name text not null,
  stop_type public.stop_type not null default 'sight',
  maps_query text,
  maps_url text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  travel_minutes integer check (travel_minutes >= 0),
  travel_needs_review boolean not null default false,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  is_fixed boolean not null default false,
  planned_arrival_at timestamptz,
  planned_departure_at timestamptz,
  status public.stop_status not null default 'not_started',
  started_at timestamptz,
  completed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  check (not is_fixed or planned_arrival_at is not null)
);

-- Only one stop in progress per trip
create unique index trip_stops_one_in_progress
  on public.trip_stops (trip_id) where status = 'in_progress';
create index trip_stops_day_order on public.trip_stops (trip_day_id, sort_order);
create index trip_stops_trip on public.trip_stops (trip_id);
create index trips_user on public.trips (user_id);
-- Cover the user_id foreign keys used by RLS
create index trip_days_user on public.trip_days (user_id);
create index trip_stops_user on public.trip_stops (user_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger (SPEC §4.2)
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trips_set_updated_at before update on public.trips
  for each row execute function public.set_updated_at();
create trigger trip_days_set_updated_at before update on public.trip_days
  for each row execute function public.set_updated_at();
create trigger trip_stops_set_updated_at before update on public.trip_stops
  for each row execute function public.set_updated_at();

revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Privileges: signed-in users only. RLS below restricts rows to the owner.
-- (The project's default privileges grant everything to anon; take it back.)
-- ---------------------------------------------------------------------------
revoke all on public.trips, public.trip_days, public.trip_stops from anon;
revoke all on public.trips, public.trip_days, public.trip_stops from authenticated;
grant select, insert, update, delete on public.trips, public.trip_days, public.trip_stops to authenticated;

-- ---------------------------------------------------------------------------
-- RLS (SPEC §4.3)
-- ---------------------------------------------------------------------------
alter table public.trips enable row level security;
create policy trips_own on public.trips for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.trip_days enable row level security;
create policy days_own on public.trip_days for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.trips t
                where t.id = trip_days.trip_id and t.user_id = (select auth.uid()))
  );

alter table public.trip_stops enable row level security;
create policy stops_own on public.trip_stops for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.trip_days d
                where d.id = trip_stops.trip_day_id
                  and d.trip_id = trip_stops.trip_id
                  and d.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Keep-alive (SPEC §4.4)
-- ---------------------------------------------------------------------------
create function public.keepalive() returns timestamptz
language sql
stable
set search_path = ''
as $$ select now() $$;

revoke execute on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
