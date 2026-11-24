import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { GameSync } from '../hooks/useGameSync'
import { game, sync } from './fixtures'

const state: { sync: GameSync } = { sync: sync() }

vi.mock('../hooks/useGameSync', () => ({ useGameSync: () => state.sync }))
vi.mock('../hooks/useSpotifyAuth', () => ({
  useSpotifyAuth: () => ({ configured: true, authenticated: true, login: vi.fn(), logout: vi.fn() }),
}))
vi.mock('../hooks/useSpotifyPlayer', () => ({
  useSpotifyPlayer: () => ({
    ready: true,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(() => Promise.resolve()),
    resume: vi.fn(() => Promise.resolve()),
    nowPlaying: null,
  }),
}))
vi.mock('../lib/sfx', () => ({ playCorrect: vi.fn(), playWrong: vi.fn() }))
vi.mock('../services/gameService', () => ({
  StealTakenError: class extends Error {},
  startGame: vi.fn(() => Promise.resolve()),
  submitGuess: vi.fn(() => Promise.resolve()),
  submitSteal: vi.fn(() => Promise.resolve()),
  submitBonus: vi.fn(() => Promise.resolve()),
  resolveGuess: vi.fn(() => Promise.resolve()),
  advanceTurn: vi.fn(() => Promise.resolve()),
  awardBonus: vi.fn(() => Promise.resolve()),
  awardSteal: vi.fn(() => Promise.resolve()),
}))

import * as svc from '../services/gameService'
import Host from '../pages/Host'
import PlayerView from '../pages/Player'

const renderAt = (path: string, el: React.ReactNode, route: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={el} />
      </Routes>
    </MemoryRouter>
  )

beforeEach(() => {
  vi.clearAllMocks()
  state.sync = sync()
})

describe('Hitster · Host', () => {
  it('en joc mostra el torn de l\'equip actiu', () => {
    renderAt('/hitster/host/ABCDE', <Host />, '/hitster/host/:code')
    expect(screen.getByText('Torn de Rockers')).toBeInTheDocument()
  })

  it('valida la resposta de l\'equip actiu amb les regles del joc', async () => {
    state.sync = sync({
      latestGuess: {
        id: 'gu1', game_id: 'g1', team_id: 't1', song_id: 'c9', position: 1, correct: null,
        used_joker: false, submitted_by: 'p1', created_at: '', bonus_artist: null,
        bonus_title: null, bonus_correct: null,
      },
    })
    renderAt('/hitster/host/ABCDE', <Host />, '/hitster/host/:code')
    // 1985 entre 1975 i 1990 → correcte
    await waitFor(() => expect(svc.resolveGuess).toHaveBeenCalledWith('gu1', true))
  })

  it('una resposta en posició errònia es marca incorrecta', async () => {
    state.sync = sync({
      latestGuess: {
        id: 'gu2', game_id: 'g1', team_id: 't1', song_id: 'c9', position: 2, correct: null,
        used_joker: false, submitted_by: 'p1', created_at: '', bonus_artist: null,
        bonus_title: null, bonus_correct: null,
      },
    })
    renderAt('/hitster/host/ABCDE', <Host />, '/hitster/host/:code')
    await waitFor(() => expect(svc.resolveGuess).toHaveBeenCalledWith('gu2', false))
  })

  it('mostra el guanyador quan acaba', () => {
    state.sync = sync({ game: game({ status: 'finished', winner_team_id: 't2' }) })
    renderAt('/hitster/host/ABCDE', <Host />, '/hitster/host/:code')
    expect(screen.getByText('Partida acabada')).toBeInTheDocument()
    expect(screen.getByText('Popers')).toBeInTheDocument()
  })
})

describe('Hitster · Player', () => {
  beforeEach(() => localStorage.setItem('hitster:playerId:ABCDE', 'p1'))

  it('a la sala d\'espera avisa que s\'esperi', () => {
    state.sync = sync({ game: game({ status: 'waiting', turn_phase: null }) })
    renderAt('/hitster/play/ABCDE', <PlayerView />, '/hitster/play/:code')
    expect(screen.getByText(/Esperant que l'amfitrió comenci/)).toBeInTheDocument()
  })

  it('quan és el seu torn pot col·locar la carta a la línia', async () => {
    state.sync = sync({ game: game({ turn_phase: 'song_playing' }) })
    renderAt('/hitster/play/ABCDE', <PlayerView />, '/hitster/play/:code')
    expect(screen.getByText('És el vostre torn!')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Col·loca a la posició 1'))
    await waitFor(() =>
      expect(svc.submitGuess).toHaveBeenCalledWith(
        expect.objectContaining({ gameId: 'g1', teamId: 't1', cardId: 'c9', position: 1, playerId: 'p1' })
      )
    )
  })

  it('pot gastar una fitxa per veure l\'any', () => {
    state.sync = sync({ game: game({ turn_phase: 'song_playing' }) })
    renderAt('/hitster/play/ABCDE', <PlayerView />, '/hitster/play/:code')
    fireEvent.click(screen.getByRole('button', { name: /Feu servir una fitxa/ }))
    expect(screen.getByText('Pista: any 1985')).toBeInTheDocument()
  })

  it('si no és el seu torn no pot col·locar', () => {
    state.sync = sync({ game: game({ turn_phase: 'song_playing' }) })
    localStorage.setItem('hitster:playerId:ABCDE', 'p2')
    renderAt('/hitster/play/ABCDE', <PlayerView />, '/hitster/play/:code')
    expect(screen.queryByLabelText('Col·loca a la posició 1')).not.toBeInTheDocument()
  })
})
