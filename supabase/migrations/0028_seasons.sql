-- Season I (Halloween): schema for the LearnPass.
-- Plan: docs/superpowers/plans/2026-10-27-season-und-learnpass.md §3.1.
-- All writes go through security-definer RPCs (0029); tables are read-only for clients.

create table public.seasons (
  id text primary key,                          -- '2026-11-halloween'
  label text not null,                          -- 'Season I – Halloween'
  theme text not null,                          -- 'halloween'
  starts_on date not null,
  -- Sunday is the normal end (enforced by teacher_set_season_dates); "Jetzt beenden" may end earlier,
  -- on the start day itself the window shrinks to a single day (review W5).
  ends_on date not null check (ends_on >= starts_on),
  closed_at timestamptz
);

-- One row per tier. A tier may carry several rewards at once (plan §13 no. 1).
create table public.season_tiers (
  season text not null references public.seasons on delete cascade,
  tier int not null check (tier between 1 and 40),
  xp int not null check (xp > 0),               -- cumulative season XP
  coins int not null default 0 check (coins >= 0),
  chest boolean not null default false,
  title_id text references public.level_rewards,
  frame_id text references public.level_rewards,
  item_id text references public.items,
  choice boolean not null default false,        -- tier 40: free pick from the chest pool
  primary key (season, tier)
);

create table public.season_claims (
  player_id uuid not null references public.profiles on delete cascade,
  season text not null references public.seasons on delete cascade,
  tier int not null,
  claimed_at timestamptz not null default now(),
  auto boolean not null default false,          -- credited when the season ends
  choice_item_id text references public.items,  -- tier 40 pick, null until chosen
  primary key (player_id, season, tier),
  foreign key (season, tier) references public.season_tiers
);

create table public.season_chests (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.profiles on delete cascade,
  season text not null references public.seasons on delete cascade,
  source text not null check (source in ('pass', 'streak', 'shop')),
  ref text not null,                            -- 'tier-15' | 'streak-2026-11-04' | 'shop-2026-11-02-1'
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  rarity text check (rarity in ('common', 'rare', 'epic', 'legendary')),
  item_id text references public.items,
  duplicate boolean,
  coins int check (coins >= 0),                 -- single piece already owned -> coins
  unique (player_id, season, source, ref),
  check ((opened_at is null) = (rarity is null) and (opened_at is null) = (item_id is null))
);

-- Chest streak: one calendar day counts when at least one daily quest was solved (plan E12).
create table public.season_streaks (
  player_id uuid not null references public.profiles on delete cascade,
  season text not null references public.seasons on delete cascade,
  current int not null default 0 check (current >= 0),
  best int not null default 0 check (best >= current),
  last_day date,
  primary key (player_id, season)
);

-- Season titles and frames are owned, not unlocked by level (plan E20).
alter table public.level_rewards add column if not exists season text references public.seasons;

create table public.player_rewards (
  player_id uuid not null references public.profiles on delete cascade,
  reward_id text not null references public.level_rewards,
  granted_at timestamptz not null default now(),
  primary key (player_id, reward_id)
);

alter table public.items add column if not exists season text references public.seasons;
alter table public.items add column if not exists sell_price int check (sell_price >= 0); -- null = by rarity
-- GLB path goes into the existing column items.model, e.g. 'season1/warlock.glb'

-- Teacher changes are logged (plan §3.6).
create table public.season_changes (
  id bigint generated always as identity primary key,
  season text not null references public.seasons on delete cascade,
  teacher_id uuid references public.profiles,
  action text not null check (action in ('dates', 'start', 'end', 'close')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in
  ('task', 'stamp', 'purchase', 'refund', 'teacher', 'quest', 'tutorial', 'chest', 'season', 'sell'));

create index if not exists xp_ledger_player_time on public.xp_ledger (player_id, created_at);
create index if not exists season_chests_player on public.season_chests (player_id, season, opened_at);
create index if not exists season_changes_season on public.season_changes (season, created_at);

-- Row level security ------------------------------------------------------------------------------

alter table public.seasons enable row level security;
alter table public.season_tiers enable row level security;
alter table public.season_claims enable row level security;
alter table public.season_chests enable row level security;
alter table public.season_streaks enable row level security;
alter table public.player_rewards enable row level security;
alter table public.season_changes enable row level security;

create policy seasons_read on public.seasons for select to authenticated using (true);
create policy season_tiers_read on public.season_tiers for select to authenticated using (true);
create policy season_claims_read on public.season_claims for select to authenticated
  using (player_id = auth.uid() or public.is_teacher());
create policy season_chests_read on public.season_chests for select to authenticated
  using (player_id = auth.uid() or public.is_teacher());
create policy season_streaks_read on public.season_streaks for select to authenticated
  using (player_id = auth.uid() or public.is_teacher());
create policy player_rewards_read on public.player_rewards for select to authenticated
  using (player_id = auth.uid() or public.is_teacher());
create policy season_changes_read on public.season_changes for select to authenticated
  using (public.is_teacher());

revoke all on public.seasons, public.season_tiers, public.season_claims, public.season_chests,
  public.season_streaks, public.player_rewards, public.season_changes from public, anon, authenticated;
grant select on public.seasons, public.season_tiers, public.season_claims, public.season_chests,
  public.season_streaks, public.player_rewards, public.season_changes to authenticated;

revoke all on sequence public.season_chests_id_seq, public.season_changes_id_seq
  from public, anon, authenticated;
