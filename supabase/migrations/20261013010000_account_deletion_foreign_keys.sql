do $$
declare
  r record;
  fk_name text;
begin
  for r in
    select * from (values
      ('public.challenge_participants', 'user_id', 'cascade'),
      ('public.challenge_history', 'user_id', 'cascade'),
      ('public.messages', 'sender_id', 'cascade'),
      ('public.challenge_participants', 'opponent_id', 'set null'),
      ('public.challenge_history', 'opponent_id', 'set null'),
      ('public.challenge_teams', 'created_by', 'set null'),
      ('public.conversations', 'created_by', 'set null'),
      ('public.challenges', 'created_by', 'set null'),
      ('public.app_settings', 'updated_by', 'set null'),
      ('public.banned_keywords', 'created_by', 'set null')
    ) as t(tbl, col, action)
  loop
    fk_name := null;

    select c.conname into fk_name
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.contype = 'f'
      and c.conrelid = r.tbl::regclass
      and c.confrelid = 'public.profiles'::regclass
      and a.attname = r.col;

    if fk_name is null then
      raise exception 'No foreign key found on %.%', r.tbl, r.col;
    end if;

    if r.action = 'set null' then
      execute format('alter table %s alter column %I drop not null', r.tbl, r.col);
    end if;

    execute format('alter table %s drop constraint %I', r.tbl, fk_name);
    execute format(
      'alter table %s add constraint %I foreign key (%I) references public.profiles(id) on delete %s',
      r.tbl, fk_name, r.col, r.action
    );
  end loop;
end $$;
