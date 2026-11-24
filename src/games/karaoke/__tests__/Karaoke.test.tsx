import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const auth = { configured: true, authenticated: true, login: vi.fn(), logout: vi.fn() }
const player = {
  ready: true,
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(() => Promise.resolve()),
  resume: vi.fn(() => Promise.resolve()),
  nowPlaying: null,
  getPosition: vi.fn(() => 0),
}
vi.mock('../../../shared/useSpotifyAuth', () => ({ useSpotifyAuth: () => auth }))
vi.mock('../../../shared/useSpotifyPlayer', () => ({ useSpotifyPlayer: () => player }))
vi.mock('../karaokeService', () => ({
  fetchKaraokeSongs: vi.fn(() =>
    Promise.resolve([
      { id: '1', song_title: 'Bohemian Rhapsody', artist: 'Queen', audio_url: 'spotify:track:1' },
      { id: '2', song_title: 'Boig per tu', artist: 'Sau', audio_url: 'spotify:track:2' },
    ])
  ),
}))
vi.mock('../lrclib', () => ({
  fetchLyrics: vi.fn(() =>
    Promise.resolve({ synced: [{ time: 0, text: 'Is this the real life?' }], plain: null })
  ),
}))

import Karaoke from '../Karaoke'

const renderK = () =>
  render(
    <MemoryRouter>
      <Karaoke />
    </MemoryRouter>
  )

beforeEach(() => {
  vi.clearAllMocks()
  auth.authenticated = true
  Element.prototype.scrollIntoView = vi.fn()
})

describe('Karaoke', () => {
  it('sense sessió de Spotify demana connectar', () => {
    auth.authenticated = false
    renderK()
    fireEvent.click(screen.getByRole('button', { name: 'Connecta amb Spotify' }))
    expect(auth.login).toHaveBeenCalled()
  })

  it('té el botó de com es juga', () => {
    renderK()
    expect(screen.getByRole('button', { name: /com es juga/i })).toBeInTheDocument()
  })

  it('llista i filtra cançons per títol o artista', async () => {
    renderK()
    expect(await screen.findByText('Bohemian Rhapsody')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/Cerca/), { target: { value: 'sau' } })
    expect(screen.queryByText('Bohemian Rhapsody')).not.toBeInTheDocument()
    expect(screen.getByText('Boig per tu')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/Cerca/), { target: { value: 'zzz' } })
    expect(screen.getByText(/Cap cançó/)).toBeInTheDocument()
  })

  it('en triar una cançó la reprodueix i mostra la lletra', async () => {
    renderK()
    fireEvent.click(await screen.findByText('Bohemian Rhapsody'))
    await waitFor(() => expect(player.play).toHaveBeenCalledWith('spotify:track:1'))
    expect(await screen.findByText('Is this the real life?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '← Cançons' }))
    expect(player.pause).toHaveBeenCalled()
    expect(await screen.findByText('Boig per tu')).toBeInTheDocument()
  })
})
