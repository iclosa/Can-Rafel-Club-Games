import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HowToPlay from '../HowToPlay'
import GameLobby from '../GameLobby'
import { GAMES } from '../gamesCatalog'

describe('HowToPlay', () => {
  it.each(GAMES.map((g) => g.id))('mostra les instruccions de %s', (id) => {
    render(<HowToPlay gameId={id} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /com es juga/i }))
    const dialog = screen.getByRole('dialog')
    const game = GAMES.find((g) => g.id === id)!
    expect(dialog).toHaveTextContent(game.name)
    expect(dialog.querySelectorAll('li')).toHaveLength(game.howTo.length)
  })

  it('es tanca amb el botó i amb Escape', () => {
    render(<HowToPlay gameId="trivial" />)
    fireEvent.click(screen.getByRole('button', { name: /com es juga/i }))
    fireEvent.click(screen.getByRole('button', { name: /entesos/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /com es juga/i }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('no mostra res per a un joc desconegut', () => {
    const { container } = render(<HowToPlay gameId="xxx" />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('GameLobby', () => {
  it('mostra títol, codi de sala, QR, botó de com es juga i contingut', () => {
    const { container } = render(
      <MemoryRouter>
        <GameLobby theme="bingo" title="Bingo Musical" subtitle="sub" code="ABCDE" joinUrl="https://x/bingo/join/ABCDE">
          <p>contingut</p>
        </GameLobby>
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: 'Bingo Musical' })).toBeInTheDocument()
    expect(screen.getByText('ABCDE')).toBeInTheDocument()
    expect(screen.getByText('contingut')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /com es juga/i })).toBeInTheDocument()
  })
})
