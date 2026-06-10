import type { BombaState, TrivialTeam } from './types'

const COLORS = ['opt-red', 'opt-blue', 'opt-gold', 'opt-green']
const SHAPES = ['▲', '◆', '●', '■']

interface Props {
  state: BombaState
  teams: TrivialTeam[]
  mode: 'host' | 'player'
  myTeamId?: string | null
  onAnswer?: (choice: number) => void
}

export default function BombaView({ state, teams, mode, myTeamId, onAnswer }: Props) {
  const name = (id: string | null | undefined) => teams.find((t) => t.id === id)?.name ?? '—'
  const holder = state.alive[state.turnIdx] ?? null
  const isHolder = mode === 'player' && myTeamId === holder

  return (
    <div className="bomba">
      <div className={`bomba-ball${isHolder ? ' mine' : ''}`}>💣</div>
      <p className="bomba-holder">
        La bomba la té: <strong>{name(holder)}</strong>
      </p>

      {mode === 'host' ? (
        <>
          <h3 className="bomba-q">{state.qtext}</h3>
          <div className="triv-opts">
            {state.qoptions.map((opt, i) => (
              <div key={i} className={`triv-opt triv-opt--wide ${COLORS[i]}`}>
                <span className="triv-shape">{SHAPES[i]}</span> {opt}
              </div>
            ))}
          </div>
        </>
      ) : isHolder ? (
        <>
          <h3 className="bomba-q">{state.qtext}</h3>
          <div className="triv-opts">
            {state.qoptions.map((opt, i) => (
              <button
                key={i}
                className={`triv-opt triv-opt--wide ${COLORS[i]}`}
                onClick={() => onAnswer?.(i)}
              >
                <span className="triv-shape">{SHAPES[i]}</span> {opt}
              </button>
            ))}
          </div>
          <p className="bomba-holder">Encerta per passar la bomba! 💥</p>
        </>
      ) : (
        <p className="triv-muted">{name(holder)} està contestant… que no t'esclati a tu!</p>
      )}
    </div>
  )
}
