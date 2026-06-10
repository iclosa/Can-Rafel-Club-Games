import type { EmojiState, TrivialTeam } from './types'

interface Props {
  state: EmojiState
  teams: TrivialTeam[]
  mode: 'host' | 'player'
  myTeamId?: string | null
  onAnswer?: (choice: number) => void
  onNext?: () => void
}

export default function EmojiView({ state, teams, mode, myTeamId, onAnswer, onNext }: Props) {
  const puzzle = state.puzzles[state.idx]
  if (!puzzle) return null
  const isReveal = state.pstate === 'reveal'
  const iAnswered = myTeamId ? state.answered.includes(myTeamId) : false
  const canAnswer = mode === 'player' && !isReveal && !iAnswered
  const winnerName = teams.find((t) => t.id === state.solvedBy)?.name

  return (
    <div className="emoji-mg">
      <p className="emoji-progress">Emoji {state.idx + 1}/{state.total}</p>
      <div className="emoji-clue">{puzzle.emoji}</div>

      <div className="emoji-opts">
        {puzzle.options.map((opt, i) => (
          <button
            key={i}
            className={`emoji-opt${isReveal && puzzle.correct === i ? ' correct' : ''}${
              isReveal && puzzle.correct !== i ? ' dim' : ''
            }`}
            disabled={!canAnswer}
            onClick={() => canAnswer && onAnswer?.(i)}
          >
            {opt}
          </button>
        ))}
      </div>

      {mode === 'player' && !isReveal && iAnswered && (
        <p className="triv-muted">Resposta enviada!</p>
      )}
      {isReveal && (
        <p className="emoji-result">
          {state.solvedBy ? `✅ Encerta ${winnerName}! (+300)` : 'Ningú ho ha encertat 😅'}
        </p>
      )}
      {mode === 'host' && isReveal && (
        <button className="triv-start" onClick={onNext}>Següent</button>
      )}
    </div>
  )
}
