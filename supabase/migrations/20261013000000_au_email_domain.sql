create or replace function public.enforce_au_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or new.email is distinct from old.email)
     and new.email is not null
     and lower(new.email) not like '%@au.edu' then
    raise exception 'Only @au.edu email addresses are allowed';
  end if;

  if tg_op = 'UPDATE'
     and new.email_change is distinct from old.email_change
     and coalesce(new.email_change, '') <> ''
     and lower(new.email_change) not like '%@au.edu' then
    raise exception 'Only @au.edu email addresses are allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_au_email_on_signup on auth.users;
create trigger enforce_au_email_on_signup
  before insert on auth.users
  for each row execute function public.enforce_au_email();

drop trigger if exists enforce_au_email_on_change on auth.users;
create trigger enforce_au_email_on_change
  before update of email, email_change on auth.users
  for each row execute function public.enforce_au_email();
