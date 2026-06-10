// Tipus del Bingo Musical (taules bingo_*). El pool de cançons és el catàleg
// global `cards`, reaprofitat del Hitster.

export type BingoStatus = 'waiting' | 'playing' | 'finished'
export type WinKind = 'line' | 'bingo'

export interface BingoSong {
  id: string
  song_title: string
  artist: string
  year: number
  audio_url?: string | null
}

export interface BingoGame {
  id: string
  code: string
  status: BingoStatus
  current_song_id: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface BingoPlayer {
  id: string
  game_id: string
  nickname: string
  is_host: boolean
}

export interface BingoCalled {
  id: string
  game_id: string
  song_id: string
  ord: number
  song?: BingoSong | null
}

export interface BingoCell {
  cell: number
  song_id: string
  song?: BingoSong | null
}

export interface BingoCard {
  id: string
  serial: number
  player_id: string | null
  cells: BingoCell[]
}

export interface BingoWin {
  id: string
  nickname: string | null
  kind: WinKind
  created_at: string
}
