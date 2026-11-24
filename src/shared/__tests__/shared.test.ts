import { describe, expect, it } from 'vitest'
import { errorMessage } from '../errorMessage'
import { generateRoomCode } from '../roomCode'
import { GAMES, gameHowTo, gameTagline } from '../gamesCatalog'

describe('errorMessage', () => {
  it('retorna el missatge d\'un Error', () => {
    expect(errorMessage(new Error('ups'))).toBe('ups')
  })
  it('retorna el missatge d\'un error pla de Supabase (no [object Object])', () => {
    const pg = { message: 'room not found', code: 'P0001', details: null }
    expect(errorMessage(pg)).toBe('room not found')
    expect(errorMessage(pg)).not.toContain('[object Object]')
  })
  it('usa details si no hi ha message', () => {
    expect(errorMessage({ details: 'detall' })).toBe('detall')
  })
  it('accepta strings i objectes sense text', () => {
    expect(errorMessage('text')).toBe('text')
    expect(errorMessage({ code: 42 })).toBe('{"code":42}')
    expect(errorMessage(undefined)).toBe('Error desconegut')
  })
})

describe('generateRoomCode', () => {
  it('genera codis de 5 caràcters sense caràcters ambigus', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode()
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{5}$/)
    }
  })
  it('respecta la longitud demanada', () => {
    expect(generateRoomCode(8)).toHaveLength(8)
  })
})

describe('gamesCatalog', () => {
  it('conté els 4 jocs amb ruta pròpia', () => {
    expect(GAMES.map((g) => g.id)).toEqual(['hitster', 'bingo', 'trivial', 'karaoke'])
    for (const g of GAMES) expect(g.path).toBe(`/${g.id}`)
  })
  it('cada joc té subtítol i instruccions de com es juga', () => {
    for (const g of GAMES) {
      expect(gameTagline(g.id)).not.toBe('')
      expect(gameHowTo(g.id).length).toBeGreaterThanOrEqual(3)
    }
  })
  it('un joc desconegut no peta', () => {
    expect(gameTagline('xxx')).toBe('')
    expect(gameHowTo('xxx')).toEqual([])
  })
})
