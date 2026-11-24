import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { BingoCalled, BingoCard, BingoGame, BingoPlayer, BingoWin } from '../types'

interface Sync {
  game: BingoGame | null
  players: BingoPlayer[]
  called: BingoCalled[]
  wins: BingoWin[]
  loading: boolean
}

const game = (over: Partial<BingoGame> = {}): BingoGame => ({
  id: 'b1',
  code: 'BINGO',
  status: 'playing',
  current_song_id: 's2',
  created_at: '',
  started_at: null,
  finished_at: null,
  ...over,
})
const song = (n: number) => ({
  id: `s${n}`,
  song_title: `Títol ${n}`,
  artist: `Artista ${n}`,
  year: 1980 + n,
  audio_url: `spotify:track:${n}`,
})
// Cartró 4×4 desordenat a propòsit per comprovar que s'ordena per cel·la.
const card: BingoCard = {
  id: 'card1',
  serial: 7,
  player_id: 'p1',
  cells: Array.from({ length: 16 }, (_, i) => 15 - i).map((cell) => ({
    cell,
    song_id: `s${cell}`,
    song: song(cell),
  })),
}
const called: BingoCalled[] = [
  { id: 'c1', game_id: 'b1', song_id: 's1', ord: 1, song: song(1) },
  { id: 'c2', game_id: 'b1', song_id: 's2', ord: 2, song: song(2) },
]

const state: { sync: Sync } = { sync: { game: game(), players: [], called, wins: [], loading: false } }

vi.mock('../useBingoSync', () => ({ useBingoSync: () => state.sync }))
vi.mock('../bingoService', () => ({
  fetchPlayerCard: vi.fn(() => Promise.resolve(card)),
  claimBingo: vi.fn(() => Promise.resolve(true)),
  callNextSong: vi.fn(() => Promise.resolve('s3')),
  createBingoGame: vi.fn(() => Promise.resolve({ gameId: 'b1', hostId: 'h' })),
  generateBingoCards: vi.fn(() => Promise.resolve()),
  startBingo: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../../shared/useSpotifyAuth', () => ({
  useSpotifyAuth: () => ({ configured: true, authenticated: true, login: vi.fn(), logout: vi.fn() }),
}))
const play = vi.fn(() => Promise.resolve())
vi.mock('../../../shared/useSpotifyPlayer', () => ({
  useSpotifyPlayer: () => ({
    ready: true,
    play,
    pause: vi.fn(() => Promise.resolve()),
    resume: vi.fn(() => Promise.resolve()),
    nowPlaying: null,
  }),
}))

import * as svc from '../bingoService'
import BingoPlay from '../pages/Play'
import BingoHost from '../pages/Host'
import BingoHome from '../pages/Home'

const renderAt = (path: string, route: string, el: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={el} />
      </Routes>
    </MemoryRouter>
  )

beforeEach(() => {
  vi.clearAllMocks()
  state.sync = { game: game(), players: [], called, wins: [], loading: false }
  localStorage.setItem('bingo:playerId:BINGO', 'p1')
})

describe('Bingo · Play (mòbil)', () => {
  it('mostra el cartró 4×4 ordenat per cel·la', async () => {
    renderAt('/bingo/play/BINGO', '/bingo/play/:code', <BingoPlay />)
    await screen.findByText('Títol 0')
    const cells = document.querySelectorAll('.bingo-cell-btn')
    expect(cells).toHaveLength(16)
    expect(cells[0]).toHaveTextContent('Títol 0')
    expect(cells[15]).toHaveTextContent('Títol 15')
    expect(screen.getByText(/Cartró #7/)).toBeInTheDocument()
  })

  it('marca i desmarca caselles', async () => {
    renderAt('/bingo/play/BINGO', '/bingo/play/:code', <BingoPlay />)
    const cell = (await screen.findByText('Títol 3')).closest('button')!
    fireEvent.click(cell)
    expect(cell).toHaveClass('marked')
    fireEvent.click(cell)
    expect(cell).not.toHaveClass('marked')
  })

  it('cantar línia i bingo crida el servidor i dona resposta', async () => {
    renderAt('/bingo/play/BINGO', '/bingo/play/:code', <BingoPlay />)
    await screen.findByText('Títol 0')
    fireEvent.click(screen.getByRole('button', { name: 'Cantar LÍNIA' }))
    expect(await screen.findByText('✅ Línia!')).toBeInTheDocument()
    expect(svc.claimBingo).toHaveBeenCalledWith('card1', 'line')

    vi.mocked(svc.claimBingo).mockResolvedValueOnce(false)
    fireEvent.click(screen.getByRole('button', { name: 'Cantar BINGO' }))
    expect(await screen.findByText('Encara no… escolta bé!')).toBeInTheDocument()
  })

  it('en espera i al final mostra els missatges adequats', async () => {
    state.sync = { ...state.sync, game: game({ status: 'waiting' }) }
    const { unmount } = renderAt('/bingo/play/BINGO', '/bingo/play/:code', <BingoPlay />)
    expect(screen.getByText('Espera que comenci la partida…')).toBeInTheDocument()
    unmount()

    state.sync = {
      ...state.sync,
      game: game({ status: 'finished' }),
      wins: [{ id: 'w', nickname: 'Maria', kind: 'bingo', created_at: '' }],
    }
    renderAt('/bingo/play/BINGO', '/bingo/play/:code', <BingoPlay />)
    expect(screen.getByText('Maria')).toBeInTheDocument()
  })
})

describe('Bingo · Host (pantalla gran)', () => {
  it('reprodueix la bola actual i amaga el títol fins que es revela', async () => {
    renderAt('/bingo/host/BINGO', '/bingo/host/:code', <BingoHost />)
    expect(screen.getByText(/2 boles cantades/)).toBeInTheDocument()
    await waitFor(() => expect(play).toHaveBeenCalledWith('spotify:track:2'))
    expect(screen.queryByText('Títol 2 — Artista 2')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mostra el títol' }))
    expect(screen.getByText('Títol 2 — Artista 2')).toBeInTheDocument()
  })

  it('demana la següent bola', async () => {
    renderAt('/bingo/host/BINGO', '/bingo/host/:code', <BingoHost />)
    fireEvent.click(screen.getByRole('button', { name: /Següent bola/ }))
    await waitFor(() => expect(svc.callNextSong).toHaveBeenCalledWith('b1'))
  })

  it('avisa quan s\'acaben les cançons', async () => {
    vi.mocked(svc.callNextSong).mockResolvedValueOnce(null)
    renderAt('/bingo/host/BINGO', '/bingo/host/:code', <BingoHost />)
    fireEvent.click(screen.getByRole('button', { name: /Següent bola/ }))
    expect(await screen.findByText("S'han acabat les cançons")).toBeInTheDocument()
  })

  it('mostra les línies cantades', () => {
    state.sync = {
      ...state.sync,
      wins: [
        { id: 'w1', nickname: 'Anna', kind: 'line', created_at: '' },
        { id: 'w2', nickname: 'Pau', kind: 'line', created_at: '' },
      ],
    }
    renderAt('/bingo/host/BINGO', '/bingo/host/:code', <BingoHost />)
    expect(screen.getByText('✅ Línia: Anna, Pau')).toBeInTheDocument()
  })
})

describe('Bingo · Lobby', () => {
  it('mostra el lobby amb el botó de com es juga', () => {
    renderAt('/bingo', '/bingo', <BingoHome />)
    expect(screen.getByRole('heading', { name: 'Bingo Musical' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /com es juga/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comença la partida' })).toBeInTheDocument()
  })
})
