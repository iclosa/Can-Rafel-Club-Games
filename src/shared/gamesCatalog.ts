// Catàleg únic de jocs: el fan servir tant el menú principal (landing) com el
// subtítol del lobby de cada joc, perquè sempre coincideixin.

export interface GameEntry {
  id: string
  name: string
  tagline: string
  path: string
  emoji: string
  ready: boolean
}

export const GAMES: GameEntry[] = [
  {
    id: 'hitster',
    name: 'Hitster',
    tagline: "Endevina l'any de la cançó i ordena la teva línia temporal",
    path: '/hitster',
    emoji: '🎵',
    ready: true,
  },
  {
    id: 'bingo',
    name: 'Bingo Musical',
    tagline: 'Marca les cançons del teu cartró a mesura que sonen',
    path: '/bingo',
    emoji: '🎱',
    ready: true,
  },
  {
    id: 'trivial',
    name: 'Trivial Party',
    tagline: 'Feu equips i responeu preguntes per categories, com més ràpid millor',
    path: '/trivial',
    emoji: '🧠',
    ready: true,
  },
  {
    id: 'karaoke',
    name: 'Karaoke',
    tagline: 'Tria una cançó i canta-la amb la lletra a pantalla',
    path: '/karaoke',
    emoji: '🎤',
    ready: true,
  },
]

export function gameTagline(id: string): string {
  return GAMES.find((g) => g.id === id)?.tagline ?? ''
}
