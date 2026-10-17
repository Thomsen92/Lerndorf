-- Lerndorf: Schema (SPEC §5). Clients never write these tables directly; see 0002_rls.sql.
-- Time zone for daily limits and week changes: Europe/Berlin.

create table classes (
  id text primary key,                 -- '8a', '8b'
  name text not null,
  layout_seed int not null,            -- fixes terrain, plots and trees
  shop_open boolean not null default true,
  build_open boolean not null default true,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text unique not null check (nickname ~ '^[A-Za-z0-9_]{3,16}$'),
  role text not null default 'student' check (role in ('student','teacher')),
  class_id text references classes,    -- null for teachers
  plot_index int,                      -- plot in the class village
  avatar jsonb not null default '{}',  -- recipe, see SPEC §7
  coins int not null default 0 check (coins >= 0),
  created_at timestamptz default now(),
  unique (class_id, plot_index),
  check (role = 'teacher' or class_id is not null)
);

create table items (                   -- catalogue, loaded from content/items.json
  id text primary key,                 -- 'deco_flowerbed_red', 'hair_05'
  kind text not null check (kind in ('deco','avatar')),
  slot text,                           -- avatar: hair|top|pants|hat|acc|pet; deco: null
  name_de text not null,
  price int not null check (price >= 0),
  footprint int[] default '{1,1}',     -- deco: grid cells [width, depth]
  model text,                          -- path to GLB or part id
  starter boolean not null default false,
  active boolean not null default true
);

create table inventory (
  player_id uuid references profiles on delete cascade,
  item_id text references items,
  qty int not null default 1 check (qty >= 0),
  primary key (player_id, item_id)
);

create table placements (
  id bigint generated always as identity primary key,
  player_id uuid references profiles on delete cascade,
  item_id text references items,
  cell_x int not null, cell_z int not null,   -- local plot grid
  rot smallint not null default 0 check (rot in (0,1,2,3))  -- times 90 degrees
);

create table tasks (
  id text primary key,                 -- '2026-11-09-v03'
  week date not null,                  -- Monday of the week
  class_id text references classes,    -- null = both classes
  type text not null check (type in ('choice','gap','match','order')),
  prompt text not null,
  data jsonb not null,                 -- options etc., WITHOUT the solution
  reward int not null default 10,
  active boolean not null default true
);

create table task_solutions (          -- never readable by clients
  task_id text primary key references tasks on delete cascade,
  solution jsonb not null
);

create table task_results (
  player_id uuid references profiles on delete cascade,
  task_id text references tasks on delete cascade,
  day date not null default (now() at time zone 'Europe/Berlin')::date,
  attempts int not null default 0,
  solved boolean not null default false,
  primary key (player_id, task_id, day)
);

create table coin_ledger (
  id bigint generated always as identity primary key,
  player_id uuid references profiles on delete cascade,
  delta int not null,
  reason text not null check (reason in ('task','stamp','purchase','refund','teacher')),
  ref text,                            -- task_id, item_id, week ...
  created_by uuid,                     -- teacher for stamp/teacher entries
  created_at timestamptz default now()
);

create table settings (                -- exactly one row
  id int primary key default 1 check (id = 1),
  stamp_reward int not null default 100,
  daily_task_cap int not null default 60,
  max_attempts int not null default 3,
  plot_cols int not null default 7,
  plot_rows int not null default 6
);
insert into settings (id) values (1);

-- Classmates are read through the function village_members() in 0002_rls.sql
-- (no view: a view would bypass RLS and expose all classes).

-- Invariant: profiles.coins = sum of coin_ledger.delta per player.
-- Only the RPC functions write both, in one transaction (see 0004+).
