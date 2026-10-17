-- Lerndorf: Row Level Security (SPEC §6).
-- Rule: every table has RLS on. Clients read only what they need; they never write.
-- Writes happen through security definer RPC functions (0004+).

alter table classes enable row level security;
alter table profiles enable row level security;
alter table items enable row level security;
alter table inventory enable row level security;
alter table placements enable row level security;
alter table tasks enable row level security;
alter table task_solutions enable row level security;
alter table task_results enable row level security;
alter table coin_ledger enable row level security;
alter table settings enable row level security;

-- Helpers: who am I, which class am I in, am I a teacher.
create or replace function public.current_class() returns text
  language sql stable security definer set search_path = public as $$
  select class_id from profiles where id = auth.uid()
$$;

create or replace function public.is_teacher() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'teacher' from profiles where id = auth.uid()), false)
$$;

-- Ids of all students in my class. Security definer, so it is not limited by RLS on profiles.
create or replace function public.class_member_ids() returns setof uuid
  language sql stable security definer set search_path = public as $$
  select id from profiles where class_id = public.current_class() and role = 'student'
$$;

-- classes: own class, teachers see all
create policy classes_read on classes for select
  using (id = public.current_class() or public.is_teacher());

-- profiles: students read their own row (incl. coins). Classmates are reached
-- only through the view village_members below, which omits coins.
create policy profiles_read_own on profiles for select
  using (id = auth.uid() or public.is_teacher());

-- items: active items for everyone, teachers see all
create policy items_read on items for select
  using (active or public.is_teacher());

create policy inventory_read on inventory for select
  using (player_id = auth.uid() or public.is_teacher());

-- placements: everyone in the same class (the village is shared)
create policy placements_read on placements for select
  using (
    public.is_teacher()
    or player_id in (select public.class_member_ids())
  );

-- tasks: active tasks of own class (or both classes), week not in the future
create policy tasks_read on tasks for select
  using (
    public.is_teacher()
    or (active
        and (class_id is null or class_id = public.current_class())
        and week <= (now() at time zone 'Europe/Berlin')::date)
  );

-- task_solutions: nobody reads them directly. Teachers only through RPC/import.
-- (No policy = no access for anon and authenticated.)

create policy task_results_read on task_results for select
  using (player_id = auth.uid() or public.is_teacher());

create policy coin_ledger_read on coin_ledger for select
  using (player_id = auth.uid() or public.is_teacher());

create policy settings_read on settings for select using (true);

-- Writes: no insert/update/delete policies on any table for clients.
-- Teachers change settings and classes only through RPCs as well (0004).

-- Classmates for the village: id, nickname, plot, avatar. Never coins.
-- Only rows of the caller's own class.
create or replace function public.village_members()
  returns table (id uuid, nickname text, plot_index int, avatar jsonb, class_id text)
  language sql stable security definer set search_path = public as $$
  select p.id, p.nickname, p.plot_index, p.avatar, p.class_id
  from profiles p
  where p.role = 'student' and p.class_id = public.current_class()
$$;

-- Clients must not write base tables directly, and must never read solutions.
revoke insert, update, delete on all tables in schema public from anon, authenticated;
revoke select on task_solutions from anon, authenticated;

-- Functions used by RLS and by the client must be callable by logged-in users only.
revoke execute on function public.class_member_ids() from anon;
revoke execute on function public.village_members() from anon;
