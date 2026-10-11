-- Photo-verified workouts for activities HealthKit can't measure (basketball, jump rope, ...).
-- Rows are written only by the validate-workout Edge Function (service role); students can
-- read their own history but never insert or edit rows themselves.
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null,
  photo_url text not null,
  verified boolean not null default false,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists workout_logs_user_created_idx
  on public.workout_logs (user_id, created_at desc);

alter table public.workout_logs enable row level security;

drop policy if exists "Students read own workout logs" on public.workout_logs;
create policy "Students read own workout logs"
  on public.workout_logs for select
  using (auth.uid() = user_id);

-- Private bucket: photos are only ever written and read with the service role.
insert into storage.buckets (id, name, public)
values ('workout-photos', 'workout-photos', false)
on conflict (id) do nothing;
