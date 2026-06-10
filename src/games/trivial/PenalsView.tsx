import type { PenalsState, TrivialTeam } from './types'

const ZONE_LABELS = ['↖', '↑', '↗', '←', '→', '↙', '↘']

interface Props {
  state: PenalsState
  teams: TrivialTeam[]
  mode: 'host' | 'player'
  myTeamId?: string | null
  onChoose?: (zone: number) => void
  onAdvance?: () => void
}

export default function PenalsView({ state, teams, mode, myTeamId, onChoose, onAdvance }: Props) {
  const name = (id: string | null) => teams.find((t) => t.id === id)?.name ?? '—'
  const m = state.matches[state.mi]
  if (!m) return null
  const shooterId = state.shooterIsA ? m.a : m.b
  const keeperId = state.shooterIsA ? m.b : m.a
  const isResult = state.duelPhase === 'result'

  const myRole =
    mode === 'player' && myTeamId === shooterId
      ? 'shooter'
      : mode === 'player' && myTeamId === keeperId
        ? 'keeper'
        : null
  const myChosen =
    (myRole === 'shooter' && state.shoot != null) || (myRole === 'keeper' && state.keep != null)
  const canPick = mode === 'player' && myRole && !myChosen && !isResult

  return (
    <div className="pk">
      <p className="pk-round">Eliminatòria · ronda {state.round}</p>
      <div className="pk-score">
        <span>{name(m.a)} <strong>{state.ga}</strong></span>
        <span className="pk-vs">–</span>
        <span><strong>{state.gb}</strong> {name(m.b)}</span>
      </div>
      <p className="pk-turn">
        ⚽ <strong>{name(shooterId)}</strong> xuta · 🧤 <strong>{name(keeperId)}</strong> para
        <span className="pk-shot"> (xut {state.shotNo + (isResult ? 0 : 1)})</span>
      </p>

      <div className="pk-goal">
        {ZONE_LABELS.map((lab, i) => {
          const shootHere = isResult && state.shoot === i
          const keepHere = isResult && state.keep === i
          return (
            <button
              key={i}
              className={`pk-zone${shootHere ? ' shoot' : ''}${keepHere ? ' keep' : ''}`}
              disabled={!canPick}
              onClick={() => canPick && onChoose?.(i)}
            >
              {shootHere && '⚽'}
              {keepHere && '🧤'}
              {!shootHere && !keepHere && <span className="pk-lab">{lab}</span>}
            </button>
          )
        })}
      </div>

      {/* Estat / accions */}
      {isResult ? (
        <>
          <p className={`pk-result ${state.lastResult?.goal ? 'goal' : 'save'}`}>
            {state.lastResult?.goal ? '⚽ GOL!' : '🧤 ATURADA!'}
          </p>
          {mode === 'host' && (
            <button className="triv-start" onClick={onAdvance}>Següent xut</button>
          )}
        </>
      ) : mode === 'player' ? (
        myRole ? (
          myChosen ? (
            <p className="pk-msg">Tria feta! Espera…</p>
          ) : (
            <p className="pk-msg">{myRole === 'shooter' ? 'On xutes?' : 'On et llances?'}</p>
          )
        ) : (
          <p className="pk-msg">Mira la pantalla… potser et toca aviat!</p>
        )
      ) : (
        <p className="pk-msg">Esperant les tries dels equips…</p>
      )}
    </div>
  )
}
