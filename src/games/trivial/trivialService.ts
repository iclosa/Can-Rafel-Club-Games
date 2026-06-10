import { supabase } from '../../shared/supabase'

function db() {
  if (!supabase) throw new Error('Supabase no està configurat')
  return supabase
}

export async function createTrivialGame(code: string): Promise<{ gameId: string; hostId: string }> {
  const { data, error } = await db().rpc('create_trivial_game', { p_code: code })
  if (error) throw error
  const r = data as { game_id: string; host_id: string }
  return { gameId: r.game_id, hostId: r.host_id }
}

// Només es demana el nom de l'equip. Mateix nom = mateix equip (col·laboratiu).
export async function joinTrivial(code: string, team: string): Promise<{ teamId: string }> {
  const { data, error } = await db().rpc('join_trivial', { p_code: code, p_team: team })
  if (error) throw error
  const r = data as { team_id: string }
  return { teamId: r.team_id }
}

export async function startTrivial(gameId: string): Promise<void> {
  const { error } = await db().rpc('start_trivial', { p_game_id: gameId })
  if (error) throw error
}

export async function submitTrivialAnswer(
  gameId: string,
  teamId: string,
  playerId: string | null,
  choice: number
): Promise<void> {
  const { error } = await db().rpc('submit_trivial_answer', {
    p_game_id: gameId,
    p_team_id: teamId,
    p_player_id: playerId,
    p_choice: choice,
  })
  if (error) throw error
}

export async function revealTrivial(gameId: string): Promise<void> {
  const { error } = await db().rpc('trivial_reveal', { p_game_id: gameId })
  if (error) throw error
}

export async function nextTrivial(gameId: string): Promise<void> {
  const { error } = await db().rpc('trivial_next', { p_game_id: gameId })
  if (error) throw error
}

export async function horseContinue(gameId: string): Promise<void> {
  const { error } = await db().rpc('trivial_horse_continue', { p_game_id: gameId })
  if (error) throw error
}

export async function penalsChoose(gameId: string, teamId: string, choice: number): Promise<void> {
  const { error } = await db().rpc('trivial_penals_choose', {
    p_game_id: gameId,
    p_team_id: teamId,
    p_choice: choice,
  })
  if (error) throw error
}

export async function penalsAdvance(gameId: string): Promise<void> {
  const { error } = await db().rpc('trivial_penals_advance', { p_game_id: gameId })
  if (error) throw error
}

// La bomba
export async function bombaPass(gameId: string, teamId: string): Promise<void> {
  const { error } = await db().rpc('trivial_bomba_pass', { p_game_id: gameId, p_team_id: teamId })
  if (error) throw error
}
export async function bombaExplode(gameId: string): Promise<void> {
  const { error } = await db().rpc('trivial_bomba_explode', { p_game_id: gameId })
  if (error) throw error
}
export async function bombaRearm(gameId: string): Promise<void> {
  const { error } = await db().rpc('trivial_bomba_rearm', { p_game_id: gameId })
  if (error) throw error
}

// Endevina amb emojis
export async function emojiAnswer(gameId: string, teamId: string, choice: number): Promise<void> {
  const { error } = await db().rpc('trivial_emoji_answer', {
    p_game_id: gameId,
    p_team_id: teamId,
    p_choice: choice,
  })
  if (error) throw error
}
export async function emojiNext(gameId: string): Promise<void> {
  const { error } = await db().rpc('trivial_emoji_next', { p_game_id: gameId })
  if (error) throw error
}
