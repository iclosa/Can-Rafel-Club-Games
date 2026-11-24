import { describe, expect, it } from 'vitest'
import { decadeOf, validateGuess } from '../lib/gameRules'

describe('validateGuess', () => {
  const line = [1975, 1990, 2005]

  it('accepta la posició correcta', () => {
    expect(validateGuess(line, 1960, 0)).toBe(true) // abans de tot
    expect(validateGuess(line, 1985, 1)).toBe(true) // entre 1975 i 1990
    expect(validateGuess(line, 2000, 2)).toBe(true) // entre 1990 i 2005
    expect(validateGuess(line, 2020, 3)).toBe(true) // després de tot
  })

  it('rebutja posicions incorrectes', () => {
    expect(validateGuess(line, 1985, 0)).toBe(false)
    expect(validateGuess(line, 1985, 2)).toBe(false)
    expect(validateGuess(line, 1960, 3)).toBe(false)
  })

  it('el mateix any que una carta és vàlid a banda i banda', () => {
    expect(validateGuess(line, 1990, 1)).toBe(true)
    expect(validateGuess(line, 1990, 2)).toBe(true)
  })

  it('amb la línia buida qualsevol any és vàlid', () => {
    expect(validateGuess([], 1999, 0)).toBe(true)
  })
})

describe('decadeOf', () => {
  it('arrodoneix a la dècada', () => {
    expect(decadeOf(1987)).toBe(1980)
    expect(decadeOf(2000)).toBe(2000)
    expect(decadeOf(2019)).toBe(2010)
  })
})
