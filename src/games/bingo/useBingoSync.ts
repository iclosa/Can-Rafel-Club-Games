import { useEffect, useState } from 'react'
import { supabase } from '../../shared/supabase'
import type { BingoCalled, BingoGame, BingoPlayer, BingoWin } from './types'

export interface BingoSync {
  game: BingoGame | null
  players: BingoPlayer[]
  called: BingoCalled[]
  wins: BingoWin[]
  loading: boolean
}

const CALLED_SELECT = '*, song:songs(id, song_title, artist, year, audio_url)'

// Estat en directe d'una partida de Bingo (game + jugadors + boles + premis).
export function useBingoSync(code: string | null): BingoSync {
  const [game, setGame] = useState<BingoGame | null>(null)
  const [players, setPlayers] = useState<BingoPlayer[]>([])
  const [called, setCalled] = useState<BingoCalled[]>([])
  const [wins, setWins] = useState<BingoWin[]>([])
  const [loading, setLoading] = useState(() => Boolean(code && supabase))

  useEffect(() => {
    if (!code || !supabase) return
    const client = supabase
    let cancelled = false
    let gameId: string | null = null

    const refetchPlayers = async () => {
      if (!gameId) return
      const { data } = await client.from('bingo_players').select('*').eq('game_id', gameId)
      if (!cancelled) setPlayers((data ?? []) as BingoPlayer[])
    }
    const refetchCalled = async () => {
      if (!gameId) return
      const { data } = await client
        .from('bingo_called')
        .select(CALLED_SELECT)
        .eq('game_id', gameId)
        .order('ord')
      if (!cancelled) setCalled((data ?? []) as BingoCalled[])
    }
    const refetchWins = async () => {
      if (!gameId) return
      const { data } = await client
        .from('bingo_wins')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at')
      if (!cancelled) setWins((data ?? []) as BingoWin[])
    }

    const onGame = (g: BingoGame | null) => {
      if (cancelled) return
      if (!g) {
        if (!gameId) {
          setGame(null)
          setLoading(false)
        }
        return
      }
      setGame(g)
      setLoading(false)
      if (!gameId) {
        gameId = g.id
        void refetchPlayers()
        void refetchCalled()
        void refetchWins()
      }
    }

    const channel = client
      .channel(`bingo:${code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bingo_games', filter: `code=eq.${code}` },
        (payload) => onGame(payload.new as BingoGame)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bingo_players' }, (p) => {
        const row = (p.new ?? p.old) as { game_id?: string } | null
        if (gameId && row?.game_id === gameId) void refetchPlayers()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bingo_called' }, (p) => {
        const row = (p.new ?? p.old) as { game_id?: string } | null
        if (gameId && row?.game_id === gameId) void refetchCalled()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bingo_wins' }, (p) => {
        const row = (p.new ?? p.old) as { game_id?: string } | null
        if (gameId && row?.game_id === gameId) void refetchWins()
      })
      .subscribe()

    client
      .from('bingo_games')
      .select('*')
      .eq('code', code)
      .maybeSingle()
      .then(({ data }) => onGame((data as BingoGame) ?? null))

    return () => {
      cancelled = true
      void channel.unsubscribe()
    }
  }, [code])

  return { game, players, called, wins, loading }
}
