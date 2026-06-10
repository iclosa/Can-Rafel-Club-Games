// Escriptures i lectures del Bingo Musical (RPCs + queries).
import { supabase } from '../../shared/supabase'
import type { BingoCard, BingoCell, WinKind } from './types'

function db() {
  if (!supabase) throw new Error('Supabase no està configurat')
  return supabase
}

export class BingoNicknameTakenError extends Error {
  constructor() {
    super('Aquest nom ja s\'està utilitzant')
    this.name = 'BingoNicknameTakenError'
  }
}

export async function createBingoGame(code: string): Promise<{ gameId: string; hostId: string }> {
  const { data, error } = await db().rpc('create_bingo_game', { p_code: code })
  if (error) throw error
  const r = data as { game_id: string; host_id: string }
  return { gameId: r.game_id, hostId: r.host_id }
}

export async function joinBingo(
  code: string,
  nickname: string
): Promise<{ playerId: string; cardId: string }> {
  const { data, error } = await db().rpc('join_bingo', { p_code: code, p_nickname: nickname })
  if (error) {
    if (error.code === '23505') throw new BingoNicknameTakenError()
    throw error
  }
  const r = data as { player_id: string; card_id: string }
  return { playerId: r.player_id, cardId: r.card_id }
}

export async function generateBingoCards(gameId: string, count: number): Promise<void> {
  const { error } = await db().rpc('generate_bingo_cards', { p_game_id: gameId, p_count: count })
  if (error) throw error
}

export async function startBingo(gameId: string): Promise<void> {
  const { error } = await db().rpc('start_bingo', { p_game_id: gameId })
  if (error) throw error
}

export async function callNextSong(gameId: string): Promise<string | null> {
  const { data, error } = await db().rpc('bingo_call_next', { p_game_id: gameId })
  if (error) throw error
  return (data as string) ?? null
}

export async function claimBingo(cardId: string, kind: WinKind): Promise<boolean> {
  const { data, error } = await db().rpc('bingo_claim', { p_card_id: cardId, p_kind: kind })
  if (error) throw error
  return Boolean(data)
}

const CELL_SELECT = 'cell, song_id, song:songs(id, song_title, artist, year)'

function rowsToCard(
  id: string,
  serial: number,
  playerId: string | null,
  cells: unknown[]
): BingoCard {
  return { id, serial, player_id: playerId, cells: (cells ?? []) as BingoCell[] }
}

// Carta d'un jugador concret.
export async function fetchPlayerCard(gameId: string, playerId: string): Promise<BingoCard | null> {
  const { data, error } = await db()
    .from('bingo_cards')
    .select(`id, serial, player_id, bingo_card_cells(${CELL_SELECT})`)
    .eq('game_id', gameId)
    .eq('player_id', playerId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const d = data as { id: string; serial: number; player_id: string; bingo_card_cells: unknown[] }
  return rowsToCard(d.id, d.serial, d.player_id, d.bingo_card_cells)
}

// Cartons imprimibles (sense jugador) d'una partida.
export async function fetchPrintableCards(gameId: string): Promise<BingoCard[]> {
  const { data, error } = await db()
    .from('bingo_cards')
    .select(`id, serial, player_id, bingo_card_cells(${CELL_SELECT})`)
    .eq('game_id', gameId)
    .is('player_id', null)
    .order('serial')
  if (error) throw error
  return ((data ?? []) as {
    id: string
    serial: number
    player_id: string | null
    bingo_card_cells: unknown[]
  }[]).map((d) => rowsToCard(d.id, d.serial, d.player_id, d.bingo_card_cells))
}
