-- AU has two campus gyms (Suvarnabhumi and Hua Mak); record which one each check-in was at.
alter table public.gym_checkins add column if not exists gym text;
