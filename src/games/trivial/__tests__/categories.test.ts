import { describe, expect, it } from 'vitest'
import { categoryColor, normalizeCategory } from '../categories'

// Categories reals de la taula trivial_questions.
const CATEGORIES = [
  'Catalunya', 'Ciència', 'Cine', 'Cultura', 'Esports', 'Gastronomia',
  'Geografia', 'Història', 'Música', 'Natura', 'Tecnologia',
]

describe('colors de categoria', () => {
  it('cada categoria té un color diferent', () => {
    const colors = CATEGORIES.map((c) => categoryColor(c).bg)
    expect(new Set(colors).size).toBe(CATEGORIES.length)
  })

  it('no depèn de majúscules ni accents', () => {
    expect(normalizeCategory(' Música ')).toBe('musica')
    expect(categoryColor('MUSICA')).toEqual(categoryColor('Música'))
    expect(categoryColor('historia')).toEqual(categoryColor('Història'))
  })

  it('una categoria nova rep un color estable', () => {
    expect(categoryColor('Astronomia')).toEqual(categoryColor('Astronomia'))
    expect(categoryColor(null).bg).toMatch(/^#/)
  })
})
