import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type {
  TrivialAnswer, TrivialGame, TrivialPlayer, TrivialQuestion, TrivialTeam,
} from '../types'

interface Sync {
  game: TrivialGame | null
  teams: TrivialTeam[]
  players: TrivialPlayer[]
  answers: TrivialAnswer[]
  question: TrivialQuestion | null
  correctIndex: number | null
  progress: Record<string, number>
  loading: boolean
}

const game = (over: Partial<TrivialGame> = {}): TrivialGame => ({
  id: 'tg', code: 'TRIVI', status: 'playing', phase: 'question', current_round: 3,
  total_rounds: 28, q_number: 3, round_q: 3, round_category: 'Música',
  current_question_id: 'q1', question_started_at: new Date().toISOString(), mg_state: null,
  ...over,
})
const teams: TrivialTeam[] = [
  { id: 'A', game_id: 'tg', name: 'Àligues', score: 1200 },
  { id: 'B', game_id: 'tg', name: 'Bous', score: 800 },
]
const question: TrivialQuestion = {
  id: 'q1', category: 'Música', text: 'Qui va cantar Thriller?',
  options: ['Prince', 'Michael Jackson', 'Madonna', 'Queen'],
}
const answer = (team: string, correct = true): TrivialAnswer => ({
  id: `a${team}`, round: 3, team_id: team, choice: 1, correct, points: 850, ms_elapsed: 4000,
})
const base = (): Sync => ({
  game: game(), teams, players: [], answers: [], question, correctIndex: null, progress: {},
  loading: false,
})
const state: { sync: Sync } = { sync: base() }

vi.mock('../useTrivialSync', () => ({ useTrivialSync: () => state.sync }))
vi.mock('../trivialService', () => {
  const ok = () => vi.fn(() => Promise.resolve())
  return {
    revealTrivial: ok(), nextTrivial: ok(), horseContinue: ok(), penalsAdvance: ok(),
    penalsChoose: ok(), bombaAnswer: ok(), bombaExplode: ok(), bombaRearm: ok(),
    emojiAnswer: ok(), emojiNext: ok(), submitTrivialAnswer: ok(), startTrivial: ok(),
    createTrivialGame: vi.fn(() => Promise.resolve({ gameId: 'tg', hostId: 'h' })),
    joinTrivial: vi.fn(() => Promise.resolve({ teamId: 'A' })),
  }
})

import * as svc from '../trivialService'
import TrivialHost from '../pages/Host'
import TrivialPlay from '../pages/Play'
import TrivialHome from '../pages/Home'
import { categoryColor } from '../categories'

const renderAt = (path: string, route: string, el: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={el} />
      </Routes>
    </MemoryRouter>
  )
const host = () => renderAt('/trivial/host/TRIVI', '/trivial/host/:code', <TrivialHost />)
const play = () => renderAt('/trivial/play/TRIVI', '/trivial/play/:code', <TrivialPlay />)

// jsdom normalitza els colors a rgb(...)
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

beforeEach(() => {
  vi.clearAllMocks()
  state.sync = base()
})

describe('Trivial · Host', () => {
  it('destaca el número de ronda', () => {
    host()
    const round = document.querySelector('.triv-round')!
    expect(round).toHaveTextContent('Ronda 3/28')
    expect(round.querySelector('strong')).toHaveTextContent('3')
  })

  it('el distintiu de categoria té el color de la categoria', () => {
    host()
    const badge = screen.getByText(/Música · pregunta 3\/4/)
    expect(badge).toHaveStyle({ background: rgb(categoryColor('Música').bg) })
  })

  it('categories diferents es pinten diferent', () => {
    state.sync = { ...base(), question: { ...question, category: 'Esports' } }
    host()
    expect(screen.getByText(/Esports · pregunta/)).toHaveStyle({
      background: rgb(categoryColor('Esports').bg),
    })
    expect(categoryColor('Esports').bg).not.toBe(categoryColor('Música').bg)
  })

  it('mostra la pregunta, les 4 opcions i qui ha respost', () => {
    state.sync = { ...base(), answers: [answer('A')] }
    host()
    expect(screen.getByText('Qui va cantar Thriller?')).toBeInTheDocument()
    expect(document.querySelectorAll('.triv-opt')).toHaveLength(4)
    expect(screen.getByText('1/2 equips han respost…')).toBeInTheDocument()
    expect(svc.revealTrivial).not.toHaveBeenCalled()
  })

  it('revela automàticament quan tots els equips han respost', async () => {
    state.sync = { ...base(), answers: [answer('A'), answer('B', false)] }
    host()
    await waitFor(() => expect(svc.revealTrivial).toHaveBeenCalledWith('tg'))
    expect(svc.revealTrivial).toHaveBeenCalledTimes(1)
  })

  it('revela quan s\'acaba el temps', async () => {
    state.sync = { ...base(), game: game({ question_started_at: new Date(Date.now() - 61_000).toISOString() }) }
    host()
    await waitFor(() => expect(svc.revealTrivial).toHaveBeenCalledWith('tg'))
  })

  it('a la revelació marca la resposta correcta', () => {
    state.sync = { ...base(), game: game({ phase: 'reveal' }), correctIndex: 1 }
    host()
    const opts = document.querySelectorAll('.triv-opt')
    expect(opts[1]).toHaveClass('correct')
    expect(opts[0]).toHaveClass('dim')
  })

  it('al final mostra el guanyador i la classificació', () => {
    state.sync = { ...base(), game: game({ status: 'finished', phase: 'finished' }) }
    host()
    expect(screen.getByText('🏆 Guanya')).toBeInTheDocument()
    expect(document.querySelector('.triv-final-name')).toHaveTextContent('Àligues')
  })

  it('cursa de cavalls: mostra els cavalls i la pregunta ràpida', () => {
    state.sync = { ...base(), game: game({ phase: 'mg_horse' }), progress: { A: 3, B: 1 } }
    host()
    expect(screen.getByText('🐎 Minijoc · Cursa de cavalls')).toBeInTheDocument()
    expect(screen.getByText('3/5')).toBeInTheDocument()
    expect(screen.getByText(/Pregunta ràpida · Música/)).toBeInTheDocument()
  })

  it('la bomba esclata quan s\'acaba la metxa', async () => {
    state.sync = {
      ...base(),
      game: game({
        phase: 'mg_bomba',
        mg_state: {
          game: 'bomba', alive: ['A', 'B'], turnIdx: 0, explodeAt: Date.now() - 10, exploded: false,
          loser: null, champion: null, qid: 'x', qtext: 'Pregunta bomba', qoptions: ['a', 'b', 'c', 'd'],
        },
      }),
    }
    host()
    expect(screen.getByText('Pregunta bomba')).toBeInTheDocument()
    await waitFor(() => expect(svc.bombaExplode).toHaveBeenCalledWith('tg'))
  })

  it('cada minijoc mostra la seva explicació', () => {
    state.sync = {
      ...base(),
      game: game({
        phase: 'mg_emoji',
        mg_state: {
          game: 'emoji', puzzles: [{ emoji: '🍕', options: ['Pizza', 'Pasta'], correct: 0 }],
          idx: 0, pstate: 'play', answered: [], solvedBy: null, total: 1,
        },
      }),
    }
    host()
    expect(screen.getByText(/Endevina amb emojis — el primer equip/)).toBeInTheDocument()
  })
})

describe('Trivial · Play (mòbil)', () => {
  beforeEach(() => localStorage.setItem('trivial:teamId:TRIVI', 'A'))

  it('mostra l\'equip i els punts', () => {
    play()
    expect(screen.getByText(/Àligues · 1200 pts/)).toBeInTheDocument()
  })

  it('respon tocant una forma', async () => {
    play()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
    fireEvent.click(buttons[2])
    await waitFor(() => expect(svc.submitTrivialAnswer).toHaveBeenCalledWith('tg', 'A', null, 2))
  })

  it('un cop respost espera', () => {
    state.sync = { ...base(), answers: [answer('A')] }
    play()
    expect(screen.getByText('Resposta enviada! Espereu…')).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('a la revelació diu si heu encertat i els punts', () => {
    state.sync = { ...base(), game: game({ phase: 'reveal' }), answers: [answer('A')], correctIndex: 1 }
    play()
    expect(screen.getByText(/Correcte! \+850 punts/)).toBeInTheDocument()
    expect(screen.getByText(/Resposta: ◆ Michael Jackson/)).toBeInTheDocument()
  })

  it('si falla o no respon ho diu', () => {
    state.sync = { ...base(), game: game({ phase: 'reveal' }), answers: [answer('A', false)], correctIndex: 1 }
    const { unmount } = play()
    expect(screen.getByText(/No heu encertat/)).toBeInTheDocument()
    unmount()
    state.sync = { ...base(), game: game({ phase: 'reveal' }), correctIndex: 1 }
    play()
    expect(screen.getByText(/No heu respost/)).toBeInTheDocument()
  })

  it('en espera i al final', () => {
    state.sync = { ...base(), game: game({ status: 'waiting', phase: 'lobby' }) }
    const { unmount } = play()
    expect(screen.getByText('Espereu que comenci la partida…')).toBeInTheDocument()
    unmount()
    state.sync = { ...base(), game: game({ status: 'finished', phase: 'finished' }) }
    play()
    expect(screen.getByText('Àligues', { selector: 'strong' })).toBeInTheDocument()
  })

  it('als penals el meu equip pot xutar', async () => {
    state.sync = {
      ...base(),
      game: game({
        phase: 'mg_penals',
        mg_state: {
          game: 'penals', round: 1, matches: [{ a: 'A', b: 'B', winner: null }], mi: 0, shotNo: 1,
          shooterIsA: true, ga: 0, gb: 0, shoot: null, keep: null, duelPhase: 'pick',
          lastResult: null, champion: null,
        },
      }),
    }
    play()
    fireEvent.click(screen.getByText('↑'))
    await waitFor(() => expect(svc.penalsChoose).toHaveBeenCalledWith('tg', 'A', 1))
  })
})

describe('Trivial · Lobby', () => {
  it('mostra els equips i deixa començar amb 2', async () => {
    renderAt('/trivial', '/trivial', <TrivialHome />)
    expect(screen.getByRole('button', { name: /com es juga/i })).toBeInTheDocument()
    expect(screen.getByText('Àligues')).toBeInTheDocument()
    expect(screen.getByText('Equips (2)')).toBeInTheDocument()
  })
})
