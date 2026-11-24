// Color propi per a cada categoria del Trivial (fons + text del distintiu).
export interface CategoryColor {
  bg: string
  fg: string
}

// Claus normalitzades (minúscules, sense accents). Categories actuals de
// trivial_questions: Catalunya, Ciència, Cine, Cultura, Esports, Gastronomia,
// Geografia, Història, Música, Natura, Tecnologia.
const CATEGORY_COLORS: Record<string, CategoryColor> = {
  catalunya: { bg: '#fcdd09', fg: '#b3001b' },
  ciencia: { bg: '#00a8e8', fg: '#ffffff' },
  cine: { bg: '#c1121f', fg: '#ffffff' },
  cinema: { bg: '#c1121f', fg: '#ffffff' },
  cultura: { bg: '#7b2ff7', fg: '#ffffff' },
  esports: { bg: '#f77f00', fg: '#ffffff' },
  gastronomia: { bg: '#e76f51', fg: '#ffffff' },
  geografia: { bg: '#2a9d8f', fg: '#ffffff' },
  historia: { bg: '#8d5524', fg: '#ffffff' },
  musica: { bg: '#e6007e', fg: '#ffffff' },
  natura: { bg: '#3a9d23', fg: '#ffffff' },
  tecnologia: { bg: '#1d3fbb', fg: '#ffffff' },
}

// Per a categories noves sense color assignat: un color estable segons el nom.
const FALLBACK: CategoryColor[] = [
  { bg: '#495057', fg: '#ffffff' },
  { bg: '#6d597a', fg: '#ffffff' },
  { bg: '#355070', fg: '#ffffff' },
  { bg: '#b56576', fg: '#ffffff' },
]

export function normalizeCategory(category: string): string {
  return category
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

export function categoryColor(category: string | null | undefined): CategoryColor {
  if (!category) return FALLBACK[0]
  const key = normalizeCategory(category)
  const known = CATEGORY_COLORS[key]
  if (known) return known
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return FALLBACK[h % FALLBACK.length]
}

// Estil inline per al distintiu de categoria i la vora de la targeta.
export function categoryStyle(category: string | null | undefined) {
  const c = categoryColor(category)
  return { background: c.bg, color: c.fg }
}
