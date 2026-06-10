// Escriptures crítiques de la partida. Si més endavant es mouen a Edge
// Functions, el contracte d'aquestes funcions es manté.

import { supabase } from '../lib/supabase'
import type { Game, PlayerRow } from '../types/db'

function db() {
  if (!supabase) throw new Error('Supabase no està configurat')
  return supabase
}

// Límit de jugadors per partida (configurable). Buit/invàlid = sense límit.
const MAX_PLAYERS = (() => {
  const raw = (import.meta.env.VITE_MAX_PLAYERS ?? '').trim()
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : Infinity
})()

export class RoomFullError extends Error {
  constructor() {
    super('La sala és plena')
    this.name = 'RoomFullError'
  }
}

export interface CreatedGame {
  gameId: string
  hostId: string
}

// Crea una partida en estat 'waiting' i el jugador amfitrió.
export async function createGame(code: string): Promise<CreatedGame> {
  const { data: game, error } = await db()
    .from('games')
    .insert({ code })
    .select()
    .single()
  if (error) throw error
  const g = game as Game

  const { data: host, error: hostErr } = await db()
    .from('players')
    .insert({ game_id: g.id, nickname: 'Amfitrió', is_host: true })
    .select()
    .single()
  if (hostErr) throw hostErr
  const h = host as PlayerRow

  await db().from('games').update({ host_player_id: h.id }).eq('id', g.id)
  return { gameId: g.id, hostId: h.id }
}

export class NicknameTakenError extends Error {
  constructor() {
    super('Aquest nom d\'equip ja s\'està utilitzant')
    this.name = 'NicknameTakenError'
  }
}

// Insereix un jugador a la partida amb el codi donat. Llança NicknameTakenError
// si el nickname ja existeix (violació de UNIQUE → codi 23505).
export async function joinGame(code: string, nickname: string): Promise<PlayerRow> {
  const { data: game, error: gErr } = await db()
    .from('games')
    .select('id, status')
    .eq('code', code)
    .maybeSingle()
  if (gErr) throw gErr
  if (!game) throw new Error('La sala no existeix')
  if ((game as { status: string }).status !== 'waiting') {
    throw new Error('La partida ja ha començat')
  }

  const gameId = (game as { id: string }).id

  // Comprova el límit de jugadors (no compta l'amfitrió).
  if (MAX_PLAYERS !== Infinity) {
    const { count } = await db()
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId)
      .eq('is_host', false)
    if (count != null && count >= MAX_PLAYERS) throw new RoomFullError()
  }

  const { data, error } = await db()
    .from('players')
    .insert({ game_id: gameId, nickname: nickname.trim() })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new NicknameTakenError()
    throw error
  }
  return data as PlayerRow
}

// Inicia la partida: crea un equip per jugador i assigna cartes (RPC atòmic).
export async function startGame(gameId: string): Promise<void> {
  const { error } = await db().rpc('start_game', { p_game_id: gameId })
  if (error) throw error
}

// El jugador de l'equip actiu envia la posició escollida.
export async function submitGuess(args: {
  gameId: string
  teamId: string
  cardId: string
  position: number
  usedJoker: boolean
  playerId: string
}): Promise<void> {
  const { error } = await db().rpc('submit_guess', {
    p_game_id: args.gameId,
    p_team_id: args.teamId,
    p_card_id: args.cardId,
    p_position: args.position,
    p_used_joker: args.usedJoker,
    p_player_id: args.playerId,
  })
  if (error) throw error
}

// L'amfitrió resol la resposta (correcció calculada al host).
export async function resolveGuess(guessId: string, correct: boolean): Promise<void> {
  const { error } = await db().rpc('resolve_guess', {
    p_guess_id: guessId,
    p_correct: correct,
  })
  if (error) throw error
}

// L'amfitrió avança al següent torn (o acaba la partida).
export async function advanceTurn(gameId: string): Promise<void> {
  const { error } = await db().rpc('advance_turn', { p_game_id: gameId })
  if (error) throw error
}

// L'equip envia el seu intent de bonus (artista + cançó). Buit = no ho intenta.
export async function submitBonus(
  guessId: string,
  artist: string,
  title: string
): Promise<void> {
  const { error } = await db().rpc('submit_bonus', {
    p_guess_id: guessId,
    p_artist: artist,
    p_title: title,
  })
  if (error) throw error
}

// L'amfitrió valida el bonus; si és correcte l'equip guanya una fitxa.
export async function awardBonus(guessId: string, correct: boolean): Promise<void> {
  const { error } = await db().rpc('award_bonus', {
    p_guess_id: guessId,
    p_correct: correct,
  })
  if (error) throw error
}

export class StealTakenError extends Error {
  constructor() {
    super('Un altre equip ja ha robat aquesta carta')
    this.name = 'StealTakenError'
  }
}

// Un equip no-actiu intenta robar (gasta una fitxa). Llança StealTakenError si
// algú s'hi ha avançat.
export async function submitSteal(args: {
  gameId: string
  cardId: string
  teamId: string
  position: number
  playerId: string
}): Promise<void> {
  const { error } = await db().rpc('submit_steal', {
    p_game_id: args.gameId,
    p_card_id: args.cardId,
    p_team_id: args.teamId,
    p_position: args.position,
    p_player_id: args.playerId,
  })
  if (error) {
    if (error.code === '23505') throw new StealTakenError()
    throw error
  }
}

// L'amfitrió aplica el robatori (si l'actiu falla i el lladre encerta).
export async function awardSteal(stealId: string, correct: boolean): Promise<void> {
  const { error } = await db().rpc('award_steal', {
    p_steal_id: stealId,
    p_correct: correct,
  })
  if (error) throw error
}
