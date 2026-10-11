-- Challenge goal types become STEPS, CALORIES, KM (distance) and SESSIONS (photo-verified
-- sport sessions). A SESSIONS challenge names its sport, and daily sport missions and
-- workout logs record the sport they were for, so a verified session can be matched to it.
alter table public.challenges add column if not exists sport text;
alter table public.missions add column if not exists sport text;
alter table public.workout_logs add column if not exists sport text;

-- Walking + running distance from HealthKit, for KM challenges.
alter table public.daily_stats add column if not exists distance_km numeric not null default 0;
