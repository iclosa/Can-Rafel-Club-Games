import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchLyrics, parseLrc } from '../lrclib'

describe('parseLrc', () => {
  it('converteix les marques de temps a mil·lisegons i ordena', () => {
    const lines = parseLrc('[00:12.50]Segona\n[00:01.00]Primera\n[01:00]Minut')
    expect(lines).toEqual([
      { time: 1000, text: 'Primera' },
      { time: 12500, text: 'Segona' },
      { time: 60000, text: 'Minut' },
    ])
  })

  it('una línia amb diverses marques es repeteix (tornades)', () => {
    const lines = parseLrc('[00:05.00][00:30.00]Tornada')
    expect(lines.map((l) => l.time)).toEqual([5000, 30000])
    expect(lines.every((l) => l.text === 'Tornada')).toBe(true)
  })

  it('ignora línies sense marca', () => {
    expect(parseLrc('títol sense temps\n[00:02.00]Hola')).toEqual([{ time: 2000, text: 'Hola' }])
  })
})

const json = (body: unknown, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response)

describe('fetchLyrics', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fa servir la cerca exacta si hi ha lletra', async () => {
    const fetch = vi.fn((_url: string) => json({ syncedLyrics: '[00:01.00]Hola', plainLyrics: 'Hola' }))
    vi.stubGlobal('fetch', fetch)
    const r = await fetchLyrics('Cançó', 'Artista feat. Altre')
    expect(r.synced).toEqual([{ time: 1000, text: 'Hola' }])
    expect(r.plain).toBe('Hola')
    // treu el "feat." de l'artista
    const url = new URL(fetch.mock.calls[0][0])
    expect(url.searchParams.get('artist_name')).toBe('Artista')
    expect(url.searchParams.get('track_name')).toBe('Cançó')
  })

  it('si no la troba, prova la cerca difusa', async () => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => json({}, false))
      .mockImplementationOnce(() => json([{ plainLyrics: 'només text' }]))
    vi.stubGlobal('fetch', fetch)
    const r = await fetchLyrics('Cançó', 'Artista')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(r).toEqual({ synced: null, plain: 'només text' })
  })

  it('sense xarxa retorna buit sense petar', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    expect(await fetchLyrics('x', 'y')).toEqual({ synced: null, plain: null })
  })
})
