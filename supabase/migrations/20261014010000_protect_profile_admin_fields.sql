create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and (new.role is distinct from old.role
          or new.suspended is distinct from old.suspended
          or new.flagged is distinct from old.flagged
          or new.flag_reason is distinct from old.flag_reason)
     and not exists (
       select 1 from public.profiles where id = auth.uid() and role = 'admin'
     ) then
    raise exception 'Only admins can change role, suspension or flag fields';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_admin_fields on public.profiles;
create trigger protect_profile_admin_fields
  before update on public.profiles
  for each row execute function public.protect_profile_admin_fields();
