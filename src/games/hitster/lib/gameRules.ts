// Regles pures del joc (sense Supabase). Reutilitzables al backend si es migra.

// Valida si col·locar una carta de l'any `currentYear` a la posició
// `guessedPosition` és correcte, donada una línia temporal d'anys ORDENADA
// ascendentment. position 0 = abans de tot; n = després de tot.
// Si dues cartes tenen el mateix any, qualsevol posició entre elles és vàlida
// (comparadors >= / <=).
export function validateGuess(
  timelineYears: number[],
  currentYear: number,
  guessedPosition: number
): boolean {
  const before = timelineYears[guessedPosition - 1] ?? -Infinity
  const after = timelineYears[guessedPosition] ?? Infinity
  return currentYear >= before && currentYear <= after
}

// Dècada d'un any (pista del comodí): 1987 → 1980.
export function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10
}
