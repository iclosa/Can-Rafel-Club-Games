import type { GameSync } from '../hooks/useGameSync'
import type { Card, Game, PlayerRow, Team, TeamCard } from '../types/db'

export const game = (over: Partial<Game> = {}): Game => ({
  id: 'g1',
  code: 'ABCDE',
  status: 'playing',
  turn_phase: 'guessing',
  number_of_teams: 2,
  current_team_index: 0,
  current_song_id: 'c9',
  winning_cards: 10,
  winner_team_id: null,
  host_player_id: 'host',
  created_at: '',
  started_at: null,
  finished_at: null,
  ...over,
})

export const teams: Team[] = [
  { id: 't1', game_id: 'g1', name: 'Rockers', jokers: 2, turn_order: 0 },
  { id: 't2', game_id: 'g1', name: 'Popers', jokers: 0, turn_order: 1 },
]

export const players: PlayerRow[] = [
  { id: 'host', game_id: 'g1', nickname: 'Host', team_id: null, is_host: true, joined_at: '' },
  { id: 'p1', game_id: 'g1', nickname: 'Rockers', team_id: 't1', is_host: false, joined_at: '' },
  { id: 'p2', game_id: 'g1', nickname: 'Popers', team_id: 't2', is_host: false, joined_at: '' },
]

const tc = (id: string, team: string, position: number, year: number): TeamCard => ({
  id,
  team_id: team,
  song_id: `s${id}`,
  position,
  is_initial: position === 0,
  placed_at: '',
  card: { id: `s${id}`, song_title: `Cançó ${year}`, artist: 'Artista', year },
})

export const teamCards: TeamCard[] = [
  tc('a', 't1', 1, 1990),
  tc('b', 't1', 0, 1975),
  tc('c', 't2', 0, 2005),
]

export const currentCard: Card = {
  id: 'c9',
  song_title: 'Misteri',
  artist: 'Anònim',
  year: 1985,
  audio_url: 'spotify:track:x',
}

export const sync = (over: Partial<GameSync> = {}): GameSync => ({
  game: game(),
  players,
  teams,
  teamCards,
  currentCard,
  latestGuess: null,
  currentSteal: null,
  loading: false,
  ...over,
})
