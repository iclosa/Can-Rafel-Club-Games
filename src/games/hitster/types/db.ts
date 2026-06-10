// Tipus de les files de Postgres (font de veritat). Reflecteixen supabase/schema.sql.

export type GameStatus = 'waiting' | 'playing' | 'finished'
export type TurnPhase =
  | 'turn_starting'
  | 'song_playing'
  | 'guessing'
  | 'revealing'
  | 'next_turn'

export interface Game {
  id: string
  code: string
  status: GameStatus
  turn_phase: TurnPhase | null
  number_of_teams: number | null
  current_team_index: number | null
  current_song_id: string | null
  winning_cards: number
  winner_team_id: string | null
  host_player_id: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface PlayerRow {
  id: string
  game_id: string
  nickname: string
  team_id: string | null
  is_host: boolean
  joined_at: string
}

export interface Team {
  id: string
  game_id: string
  name: string
  jokers: number
  turn_order: number
}

export interface Card {
  id: string
  song_title: string
  artist: string
  year: number
  audio_url: string | null
}

export interface GuessRow {
  id: string
  game_id: string
  team_id: string
  song_id: string
  position: number
  correct: boolean | null
  used_joker: boolean
  submitted_by: string | null
  created_at: string
  bonus_artist: string | null
  bonus_title: string | null
  bonus_correct: boolean | null
}

export interface StealRow {
  id: string
  game_id: string
  song_id: string
  team_id: string
  position: number
  player_id: string | null
  won: boolean | null
  created_at: string
}

export interface TeamCard {
  id: string
  team_id: string
  song_id: string
  position: number
  is_initial: boolean
  placed_at: string
  // Cançó incrustada via select('*, card:songs(...)')
  card?: Pick<Card, 'id' | 'song_title' | 'artist' | 'year'> | null
}
