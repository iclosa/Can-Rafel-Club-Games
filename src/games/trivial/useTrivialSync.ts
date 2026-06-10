import { useEffect, useState } from 'react'
import { supabase } from '../../shared/supabase'
import type { TrivialAnswer, TrivialGame, TrivialPlayer, TrivialQuestion, TrivialTeam } from './types'

export interface TrivialSync {
  game: TrivialGame | null
  teams: TrivialTeam[]
  players: TrivialPlayer[]
  answers: TrivialAnswer[]
  question: TrivialQuestion | null
  correctIndex: number | null
  progress: Record<string, number>
  loading: boolean
}

const REVEAL_PHASES = ['reveal', 'finished', 'mg_horse_reveal', 'mg_horse_done']

export function useTrivialSync(code: string | null): TrivialSync {
  const [game, setGame] = useState<TrivialGame | null>(null)
  const [teams, setTeams] = useState<TrivialTeam[]>([])
  const [players, setPlayers] = useState<TrivialPlayer[]>([])
  const [answers, setAnswers] = useState<TrivialAnswer[]>([])
  const [question, setQuestion] = useState<TrivialQuestion | null>(null)
  const [correctIndex, setCorrectIndex] = useState<number | null>(null)
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(() => Boolean(code && supabase))

  useEffect(() => {
    if (!code || !supabase) return
    const client = supabase
    let cancelled = false
    let gameId: string | null = null
    let qId: string | null = null
    let wasReveal = false

    const refetchTeams = async () => {
      if (!gameId) return
      const { data } = await client
        .from('trivial_teams')
        .select('*')
        .eq('game_id', gameId)
        .order('score', { ascending: false })
      if (!cancelled) setTeams((data ?? []) as TrivialTeam[])
    }
    const refetchPlayers = async () => {
      if (!gameId) return
      const { data } = await client.from('trivial_players').select('*').eq('game_id', gameId)
      if (!cancelled) setPlayers((data ?? []) as TrivialPlayer[])
    }
    const refetchAnswers = async (round: number) => {
      if (!gameId) return
      const { data } = await client
        .from('trivial_answers')
        .select('id, round, team_id, choice, correct, points, ms_elapsed')
        .eq('game_id', gameId)
        .eq('round', round)
      if (!cancelled) setAnswers((data ?? []) as TrivialAnswer[])
    }
    const refetchProgress = async () => {
      if (!gameId) return
      const { data } = await client
        .from('trivial_mg_progress')
        .select('team_id, value')
        .eq('game_id', gameId)
      if (!cancelled) {
        const map: Record<string, number> = {}
        for (const r of (data ?? []) as { team_id: string; value: number }[]) map[r.team_id] = r.value
        setProgress(map)
      }
    }
    const loadQuestion = async (id: string | null) => {
      if (!id) {
        if (!cancelled) setQuestion(null)
        return
      }
      const { data } = await client
        .from('trivial_questions')
        .select('id, category, text, options')
        .eq('id', id)
        .maybeSingle()
      if (!cancelled) setQuestion((data as TrivialQuestion) ?? null)
    }
    const loadCorrect = async (id: string | null, phase: string) => {
      if (!id || !REVEAL_PHASES.includes(phase)) {
        if (!cancelled) setCorrectIndex(null)
        return
      }
      const { data } = await client
        .from('trivial_questions')
        .select('correct_index')
        .eq('id', id)
        .maybeSingle()
      if (!cancelled)
        setCorrectIndex((data as { correct_index: number } | null)?.correct_index ?? null)
    }

    const onGame = (g: TrivialGame | null) => {
      if (cancelled) return
      // No sobreescriguis una partida ja carregada amb un null tardà (race entre
      // la càrrega inicial i l'event realtime de creació).
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
        void refetchTeams()
        void refetchPlayers()
        void refetchProgress()
      }
      if (g.current_question_id !== qId) {
        qId = g.current_question_id
        void loadQuestion(qId)
        void refetchAnswers(g.current_round)
      }
      const isReveal = REVEAL_PHASES.includes(g.phase)
      if (isReveal !== wasReveal) {
        wasReveal = isReveal
        void loadCorrect(g.current_question_id, g.phase)
        void refetchAnswers(g.current_round)
        void refetchTeams()
        void refetchProgress()
      }
    }

    const channel = client
      .channel(`trivial:${code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trivial_games', filter: `code=eq.${code}` },
        (p) => onGame(p.new as TrivialGame)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trivial_teams' }, (p) => {
        const row = (p.new ?? p.old) as { game_id?: string } | null
        if (gameId && row?.game_id === gameId) void refetchTeams()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trivial_players' }, (p) => {
        const row = (p.new ?? p.old) as { game_id?: string } | null
        if (gameId && row?.game_id === gameId) void refetchPlayers()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trivial_answers' }, (p) => {
        const row = (p.new ?? p.old) as { game_id?: string; round?: number } | null
        if (gameId && row?.game_id === gameId) void refetchAnswers(row?.round ?? 0)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trivial_mg_progress' }, (p) => {
        const row = (p.new ?? p.old) as { game_id?: string } | null
        if (gameId && row?.game_id === gameId) void refetchProgress()
      })
      .subscribe()

    client
      .from('trivial_games')
      .select('*')
      .eq('code', code)
      .maybeSingle()
      .then(({ data }) => onGame((data as TrivialGame) ?? null))

    return () => {
      cancelled = true
      void channel.unsubscribe()
    }
  }, [code])

  return { game, teams, players, answers, question, correctIndex, progress, loading }
}
