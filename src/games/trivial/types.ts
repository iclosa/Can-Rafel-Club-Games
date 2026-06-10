// Trivial Party · tipus del nucli (rondes de preguntes).
export type TrivialStatus = 'waiting' | 'playing' | 'finished'
export type TrivialPhase =
  | 'lobby'
  | 'question'
  | 'reveal'
  | 'mg_horse'
  | 'mg_horse_reveal'
  | 'mg_horse_done'
  | 'mg_penals'
  | 'mg_penals_done'
  | 'mg_bomba'
  | 'mg_bomba_boom'
  | 'mg_bomba_done'
  | 'mg_emoji'
  | 'mg_emoji_done'
  | 'finished'

export interface PenalsMatch {
  a: string
  b: string | null
  winner: string | null
}

export interface PenalsState {
  game: 'penals'
  round: number
  matches: PenalsMatch[]
  mi: number
  shotNo: number
  shooterIsA: boolean
  ga: number
  gb: number
  shoot: number | null
  keep: number | null
  duelPhase: 'pick' | 'result'
  lastResult: { shoot: number; keep: number; goal: boolean } | null
  champion: string | null
}

export interface BombaState {
  game: 'bomba'
  alive: string[]
  turnIdx: number
  explodeAt: number
  exploded: boolean
  loser: string | null
  champion: string | null
  qid: string
  qtext: string
  qoptions: string[]
}

export interface EmojiPuzzle {
  emoji: string
  options: string[]
  correct: number
}
export interface EmojiState {
  game: 'emoji'
  puzzles: EmojiPuzzle[]
  idx: number
  pstate: 'play' | 'reveal'
  answered: string[]
  solvedBy: string | null
  total: number
}

export type MgState = PenalsState | BombaState | EmojiState

export interface TrivialGame {
  id: string
  code: string
  status: TrivialStatus
  phase: TrivialPhase
  current_round: number
  total_rounds: number
  q_number: number
  round_q: number
  round_category: string | null
  current_question_id: string | null
  question_started_at: string | null
  mg_state: MgState | null
}

export interface TrivialProgress {
  team_id: string
  value: number
}

export interface TrivialTeam {
  id: string
  game_id: string
  name: string
  score: number
}

export interface TrivialPlayer {
  id: string
  game_id: string
  nickname: string
  team_id: string | null
  is_host: boolean
}

// Pregunta SENSE la resposta correcta (no es filtra als jugadors).
export interface TrivialQuestion {
  id: string
  category: string
  text: string
  options: string[]
}

export interface TrivialAnswer {
  id: string
  round: number
  team_id: string
  choice: number
  correct: boolean
  points: number
  ms_elapsed: number
}
