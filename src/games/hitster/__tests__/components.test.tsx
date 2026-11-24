import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Timeline from '../components/Timeline'
import TeamsReveal from '../components/TeamsReveal'
import { teamCards, teams } from './fixtures'

describe('Timeline', () => {
  const mine = teamCards.filter((c) => c.team_id === 't1')

  it('ordena les cartes per posició', () => {
    const { container } = render(<Timeline cards={mine} />)
    const years = [...container.querySelectorAll('.tl-year')].map((n) => n.textContent)
    expect(years).toEqual(['1975', '1990'])
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('amb onPlace mostra n+1 espais i retorna la posició triada', () => {
    const onPlace = vi.fn()
    render(<Timeline cards={mine} onPlace={onPlace} />)
    const slots = screen.getAllByRole('button')
    expect(slots).toHaveLength(3)
    fireEvent.click(screen.getByLabelText('Col·loca a la posició 1'))
    expect(onPlace).toHaveBeenCalledWith(1)
  })

  it('desactiva els espais si disabled', () => {
    render(<Timeline cards={mine} onPlace={() => {}} disabled />)
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled()
  })
})

describe('TeamsReveal', () => {
  it('mostra cartes i fitxes de cada equip', () => {
    const { container } = render(<TeamsReveal teams={teams} teamCards={teamCards} winningCards={10} />)
    const cards = container.querySelectorAll('.team-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('Rockers')
    expect(cards[0]).toHaveTextContent('🎵 2 / 10')
    expect(cards[0]).toHaveTextContent('💿💿')
    expect(cards[1]).toHaveTextContent('🎵 1 / 10')
    expect(cards[1]).toHaveTextContent('—')
  })
})
