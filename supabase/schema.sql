-- HITSTER · esquema inicial de la base de dades
-- Executa aquest fitxer a Supabase Studio → SQL Editor.
-- Nota: les polítiques RLS són permissives per a v1 (joc entre amics, sense auth).

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- per a gen_random_uuid()

-- ─────────────────────────────────────────────────────────────────────────────
-- Catàleg global de cançons
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists cards (
  id          uuid primary key default gen_random_uuid(),
  song_title  text        not null,
  artist      text        not null,
  year        int         not null check (year between 1900 and 2100),
  audio_url   text,
  created_at  timestamptz not null default now()
);

create index if not exists cards_year_idx on cards (year);

-- ─────────────────────────────────────────────────────────────────────────────
-- Partides
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists games (
  id                  uuid primary key default gen_random_uuid(),
  code                text unique not null,
  status              text not null default 'waiting'
                        check (status in ('waiting','playing','finished')),
  turn_phase          text
                        check (turn_phase in ('turn_starting','song_playing','guessing','revealing','next_turn')),
  number_of_teams     int,
  current_team_index  int default 0,
  current_card_id     uuid references cards(id),
  winning_cards       int not null default 10,
  winner_team_id      uuid,                              -- FK afegida més avall
  host_player_id      uuid,                              -- FK afegida més avall
  created_at          timestamptz not null default now(),
  started_at          timestamptz,
  finished_at         timestamptz
);

create index if not exists games_code_idx on games (code);

-- ─────────────────────────────────────────────────────────────────────────────
-- Equips
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references games(id) on delete cascade,
  name        text not null,
  jokers      int  not null default 3 check (jokers >= 0),
  turn_order  int  not null,
  unique (game_id, turn_order)
);

create index if not exists teams_game_idx on teams (game_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Jugadors
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists players (
  id        uuid primary key default gen_random_uuid(),
  game_id   uuid not null references games(id) on delete cascade,
  nickname  text not null,
  team_id   uuid references teams(id) on delete set null,
  is_host   boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (game_id, nickname)            -- ← nickname únic per partida
);

create index if not exists players_game_idx on players (game_id);

-- FKs circulars (games ↔ players, games ↔ teams)
alter table games
  add constraint games_host_player_fk
    foreign key (host_player_id) references players(id) on delete set null;

alter table games
  add constraint games_winner_team_fk
    foreign key (winner_team_id) references teams(id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Cartes col·locades a la línia temporal de cada equip
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists team_cards (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  card_id     uuid not null references cards(id),
  position    int  not null,
  is_initial  boolean not null default false,
  placed_at   timestamptz not null default now(),
  unique (team_id, card_id)
);

create index if not exists team_cards_team_idx on team_cards (team_id, position);

-- ─────────────────────────────────────────────────────────────────────────────
-- Intents de jugada
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists guesses (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games(id) on delete cascade,
  team_id       uuid not null references teams(id) on delete cascade,
  card_id       uuid not null references cards(id),
  position      int  not null,
  correct       boolean,
  used_joker    boolean not null default false,
  submitted_by  uuid references players(id),
  created_at    timestamptz not null default now()
);

create index if not exists guesses_game_idx on guesses (game_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────────────────────
-- Cal afegir les taules a la publicació "supabase_realtime" perquè els clients
-- rebin events postgres_changes. A Supabase Studio: Database → Replication.
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table team_cards;
alter publication supabase_realtime add table guesses;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (v1 permissiva)
-- ─────────────────────────────────────────────────────────────────────────────
alter table games      enable row level security;
alter table players    enable row level security;
alter table teams      enable row level security;
alter table team_cards enable row level security;
alter table guesses    enable row level security;
alter table cards      enable row level security;

-- Lectures obertes
create policy "read all games"     on games      for select using (true);
create policy "read all players"   on players    for select using (true);
create policy "read all teams"     on teams      for select using (true);
create policy "read all teamcards" on team_cards for select using (true);
create policy "read all guesses"   on guesses    for select using (true);
create policy "read all cards"     on cards      for select using (true);

-- Escriptures obertes (v1). Endurir més endavant.
create policy "anyone insert games"   on games      for insert with check (true);
create policy "anyone update games"   on games      for update using (true);
create policy "anyone insert players" on players    for insert with check (true);
create policy "anyone update players" on players    for update using (true);
create policy "anyone insert teams"   on teams      for insert with check (true);
create policy "anyone update teams"   on teams      for update using (true);
create policy "anyone insert tc"      on team_cards for insert with check (true);
create policy "anyone update tc"      on team_cards for update using (true);
create policy "anyone insert guesses" on guesses    for insert with check (true);
create policy "anyone update guesses" on guesses    for update using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Funció utilitària: validació del nickname únic (informativa; la restricció
-- UNIQUE de la taula ja és prou. Aquesta funció és per a casos avançats).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function nickname_taken(p_code text, p_nick text)
returns boolean
language sql stable
as $$
  select exists (
    select 1
      from players p
      join games  g on g.id = p.game_id
     where g.code     = p_code
       and p.nickname = p_nick
  );
$$;
