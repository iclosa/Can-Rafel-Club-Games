// Catàleg únic de jocs: el fan servir tant el menú principal (landing) com el
// subtítol del lobby de cada joc, perquè sempre coincideixin.

export interface GameEntry {
  id: string
  name: string
  tagline: string
  path: string
  emoji: string
  ready: boolean
  // Explicació molt breu de com es juga (botó "Com es juga").
  howTo: string[]
}

export const GAMES: GameEntry[] = [
  {
    id: 'hitster',
    name: 'Hitster',
    tagline: "Endevina l'any de la cançó i ordena la teva línia temporal",
    path: '/hitster',
    emoji: '🎵',
    ready: true,
    howTo: [
      "Cada equip s'uneix escanejant el QR amb el mòbil.",
      "Sona una cançó: l'equip de torn la col·loca a la seva línia temporal, abans o després de les cartes que ja té, segons l'any.",
      "Si l'encerteu, us quedeu la carta. Si falleu, un altre equip la pot robar.",
      "Si encerteu l'any, digueu artista i títol per guanyar una fitxa 💿 (serveix per veure l'any o per robar).",
      "Guanya el primer equip que completa la seva línia temporal.",
    ],
  },
  {
    id: 'bingo',
    name: 'Bingo Musical',
    tagline: 'Marca les cançons del teu cartró a mesura que sonen',
    path: '/bingo',
    emoji: '🎱',
    ready: true,
    howTo: [
      "Jugueu amb el cartró imprès o amb el mòbil escanejant el QR.",
      "Va sonant música: si la cançó és al teu cartró, marca-la.",
      "Completa una fila i canta LÍNIA!",
      "Completa tot el cartró i canta BINGO! El primer guanya.",
    ],
  },
  {
    id: 'trivial',
    name: 'Trivial Party',
    tagline: 'Feu equips i responeu preguntes per categories, com més ràpid millor',
    path: '/trivial',
    emoji: '🧠',
    ready: true,
    howTo: [
      "Escanegeu el QR i poseu el nom de l'equip (mateix nom = mateix equip).",
      "La pregunta surt a la pantalla gran; al mòbil toqueu la forma/color de la resposta.",
      "Com més ràpid encerteu, més punts.",
      "Entre rondes hi ha minijocs (cavalls, penals, bomba, emojis) amb punts extra.",
      "Guanya l'equip amb més punts al final.",
    ],
  },
  {
    id: 'karaoke',
    name: 'Karaoke',
    tagline: 'Tria una cançó i canta-la amb la lletra a pantalla',
    path: '/karaoke',
    emoji: '🎤',
    ready: true,
    howTo: [
      "Connecta Spotify (cal un compte Premium).",
      "Cerca i tria una cançó.",
      "Sona la música i la lletra es va ressaltant al seu moment.",
      "Agafa el micro i canta!",
    ],
  },
]

export function gameTagline(id: string): string {
  return GAMES.find((g) => g.id === id)?.tagline ?? ''
}

export function gameHowTo(id: string): string[] {
  return GAMES.find((g) => g.id === id)?.howTo ?? []
}
