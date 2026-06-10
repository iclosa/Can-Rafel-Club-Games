import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Card, Game, GuessRow, PlayerRow, StealRow, Team, TeamCard } from '../types/db'

export interface GameSync {
  game: Game | null
  players: PlayerRow[]
  teams: Team[]
  teamCards: TeamCard[]
  currentCard: Card | null
  latestGuess: GuessRow | null
  currentSteal: StealRow | null
  loading: boolean
}

// Subscriu el component a tot l'estat d'una partida (per codi) i el manté
// actualitzat via postgres_changes. La BBDD és la font de veritat.
export function useGameSync(code: string | null): GameSync {
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamCards, setTeamCards] = useState<TeamCard[]>([])
  const [currentCard, setCurrentCard] = useState<Card | null>(null)
  const [latestGuess, setLatestGuess] = useState<GuessRow | null>(null)
  const [currentSteal, setCurrentSteal] = useState<StealRow | null>(null)
  const [loading, setLoading] = useState(() => Boolean(code && supabase))

  useEffect(() => {
    if (!code || !supabase) return
    const client = supabase
    let cancelled = false
    let gameId: string | null = null
    let currentCardId: string | null = null

    const loadTeamCards = async (ts: Team[]) => {
      if (ts.length === 0) {
        if (!cancelled) setTeamCards([])
        return
      }
      const { data } = await client
        .from('team_cards')
        .select('*, card:songs(id, song_title, artist, year)')
        .in(
          'team_id',
          ts.map((t) => t.id)
        )
      if (!cancelled) setTeamCards((data ?? []) as TeamCard[])
    }

    const refetchPlayers = async () => {
      if (!gameId) return
      const { data } = await client.from('players').select('*').eq('game_id', gameId)
      if (!cancelled) setPlayers((data ?? []) as PlayerRow[])
    }

    const refetchTeams = async () => {
      if (!gameId) return
      const { data } = await client
        .from('teams')
        .select('*')
        .eq('game_id', gameId)
        .order('turn_order')
      const ts = (data ?? []) as Team[]
      if (!cancelled) setTeams(ts)
      await loadTeamCards(ts)
    }

    const loadCurrentCard = async (cardId: string | null) => {
      if (!cardId) {
        if (!cancelled) setCurrentCard(null)
        return
      }
      const { data } = await client.from('songs').select('*').eq('id', cardId).maybeSingle()
      if (!cancelled) setCurrentCard((data as Card) ?? null)
    }

    const refetchLatestGuess = async () => {
      if (!gameId || !currentCardId) {
        if (!cancelled) setLatestGuess(null)
        return
      }
      const { data } = await client
        .from('guesses')
        .select('*')
        .eq('game_id', gameId)
        .eq('song_id', currentCardId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (!cancelled) setLatestGuess(((data ?? [])[0] as GuessRow) ?? null)
    }

    const refetchSteal = async () => {
      if (!gameId || !currentCardId) {
        if (!cancelled) setCurrentSteal(null)
        return
      }
      const { data } = await client
        .from('steals')
        .select('*')
        .eq('game_id', gameId)
        .eq('song_id', currentCardId)
        .maybeSingle()
      if (!cancelled) setCurrentSteal((data as StealRow) ?? null)
    }

    const onGame = (g: Game | null) => {
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
        void refetchTeams()
      }
      if (g.current_song_id !== currentCardId) {
        currentCardId = g.current_song_id
        void loadCurrentCard(currentCardId)
        void refetchLatestGuess()
        void refetchSteal()
      }
    }

    const channel = client
      .channel(`game:${code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `code=eq.${code}` },
        (payload) => onGame(payload.new as Game)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, (payload) => {
        const row = (payload.new ?? payload.old) as { game_id?: string } | null
        if (gameId && row?.game_id === gameId) void refetchPlayers()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, (payload) => {
        const row = (payload.new ?? payload.old) as { game_id?: string } | null
        if (gameId && row?.game_id === gameId) void refetchTeams()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_cards' }, () => {
        if (gameId) void refetchTeams()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guesses' }, (payload) => {
        const row = (payload.new ?? payload.old) as { game_id?: string } | null
        if (gameId && row?.game_id === gameId) void refetchLatestGuess()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'steals' }, (payload) => {
        const row = (payload.new ?? payload.old) as { game_id?: string } | null
        if (gameId && row?.game_id === gameId) void refetchSteal()
      })
      .subscribe()

    client
      .from('games')
      .select('*')
      .eq('code', code)
      .maybeSingle()
      .then(({ data }) => onGame((data as Game) ?? null))

    return () => {
      cancelled = true
      void channel.unsubscribe()
    }
  }, [code])

  return { game, players, teams, teamCards, currentCard, latestGuess, currentSteal, loading }
}
