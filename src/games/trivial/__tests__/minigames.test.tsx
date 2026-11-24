import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import PenalsView from '../PenalsView'
import BombaView from '../BombaView'
import EmojiView from '../EmojiView'
import type { BombaState, EmojiState, PenalsState, TrivialTeam } from '../types'

const teams: TrivialTeam[] = [
  { id: 'A', game_id: 'g', name: 'Àligues', score: 0 },
  { id: 'B', game_id: 'g', name: 'Bous', score: 0 },
  { id: 'C', game_id: 'g', name: 'Cabres', score: 0 },
]

const penals = (over: Partial<PenalsState> = {}): PenalsState => ({
  game: 'penals', round: 1, matches: [{ a: 'A', b: 'B', winner: null }], mi: 0, shotNo: 1,
  shooterIsA: true, ga: 1, gb: 0, shoot: null, keep: null, duelPhase: 'pick',
  lastResult: null, champion: null, ...over,
})

describe('Penals', () => {
  it('el xutador tria zona (porteria 3×3 amb 7 zones)', () => {
    const onChoose = vi.fn()
    const { container } = render(
      <PenalsView state={penals()} teams={teams} mode="player" myTeamId="A" onChoose={onChoose} />
    )
    expect(container.querySelectorAll('.pk-zone')).toHaveLength(7)
    expect(container.querySelectorAll('.pk-empty')).toHaveLength(2)
    expect(screen.getByText('On xutes?')).toBeInTheDocument()
    fireEvent.click(screen.getByText('↗'))
    expect(onChoose).toHaveBeenCalledWith(2)
  })

  it('el porter veu "On et llances?" i un tercer equip no pot triar', () => {
    const { unmount } = render(<PenalsView state={penals()} teams={teams} mode="player" myTeamId="B" />)
    expect(screen.getByText('On et llances?')).toBeInTheDocument()
    unmount()
    render(<PenalsView state={penals()} teams={teams} mode="player" myTeamId="C" />)
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled()
  })

  it('un cop triat, espera', () => {
    render(<PenalsView state={penals({ shoot: 3 })} teams={teams} mode="player" myTeamId="A" />)
    expect(screen.getByText('Tria feta! Espera…')).toBeInTheDocument()
  })

  it('mostra el resultat GOL / ATURADA', () => {
    const { unmount } = render(
      <PenalsView
        state={penals({ duelPhase: 'result', shoot: 0, keep: 4, lastResult: { shoot: 0, keep: 4, goal: true } })}
        teams={teams}
        mode="host"
      />
    )
    expect(screen.getByText('⚽ GOL!')).toBeInTheDocument()
    unmount()
    render(
      <PenalsView
        state={penals({ duelPhase: 'result', shoot: 1, keep: 1, lastResult: { shoot: 1, keep: 1, goal: false } })}
        teams={teams}
        mode="host"
      />
    )
    expect(screen.getByText('🧤 ATURADA!')).toBeInTheDocument()
  })

  it('marcador i noms dels equips', () => {
    render(<PenalsView state={penals()} teams={teams} mode="host" />)
    expect(screen.getByText(/Àligues/, { selector: '.pk-score span' })).toHaveTextContent('Àligues 1')
  })
})

const bomba = (over: Partial<BombaState> = {}): BombaState => ({
  game: 'bomba', alive: ['A', 'B', 'C'], turnIdx: 1, explodeAt: 0, exploded: false,
  loser: null, champion: null, qid: 'q', qtext: 'Capital de França?',
  qoptions: ['Roma', 'París', 'Berlín', 'Madrid'], ...over,
})

describe('La bomba', () => {
  it('qui té la bomba veu la pregunta i pot respondre', () => {
    const onAnswer = vi.fn()
    render(<BombaView state={bomba()} teams={teams} mode="player" myTeamId="B" onAnswer={onAnswer} />)
    expect(screen.getByText('Capital de França?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /París/ }))
    expect(onAnswer).toHaveBeenCalledWith(1)
  })

  it('els altres equips només esperen', () => {
    render(<BombaView state={bomba()} teams={teams} mode="player" myTeamId="A" />)
    expect(screen.queryByText('Capital de França?')).not.toBeInTheDocument()
    expect(screen.getByText(/Bous està contestant/)).toBeInTheDocument()
  })

  it('la pantalla gran mostra la pregunta sense botons', () => {
    render(<BombaView state={bomba()} teams={teams} mode="host" />)
    expect(screen.getByText('Capital de França?')).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByText('Bous')).toBeInTheDocument()
  })
})

const emoji = (over: Partial<EmojiState> = {}): EmojiState => ({
  game: 'emoji',
  puzzles: [{ emoji: '🦁👑', options: ['El rei lleó', 'Tarzan', 'Bambi'], correct: 0 }],
  idx: 0, pstate: 'play', answered: [], solvedBy: null, total: 1, ...over,
})

describe('Endevina amb emojis', () => {
  it('l\'equip respon i després queda bloquejat', () => {
    const onAnswer = vi.fn()
    const { rerender } = render(
      <EmojiView state={emoji()} teams={teams} mode="player" myTeamId="A" onAnswer={onAnswer} />
    )
    expect(screen.getByText('🦁👑')).toBeInTheDocument()
    expect(screen.getByText('Emoji 1/1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tarzan' }))
    expect(onAnswer).toHaveBeenCalledWith(1)

    rerender(<EmojiView state={emoji({ answered: ['A'] })} teams={teams} mode="player" myTeamId="A" onAnswer={onAnswer} />)
    expect(screen.getByText('Resposta enviada!')).toBeInTheDocument()
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled()
  })

  it('a la revelació marca la correcta i qui l\'ha encertat', () => {
    render(<EmojiView state={emoji({ pstate: 'reveal', solvedBy: 'C' })} teams={teams} mode="host" />)
    expect(screen.getByRole('button', { name: 'El rei lleó' })).toHaveClass('correct')
    expect(screen.getByText('✅ Encerta Cabres! (+300)')).toBeInTheDocument()
  })

  it('si ningú l\'encerta ho diu', () => {
    render(<EmojiView state={emoji({ pstate: 'reveal' })} teams={teams} mode="host" />)
    expect(screen.getByText('Ningú ho ha encertat 😅')).toBeInTheDocument()
  })
})
