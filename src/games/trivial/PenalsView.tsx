import type { PenalsState, TrivialTeam } from './types'

// 7 zones col·locades com una porteria 3×3 (centre i baix-centre buits).
const ZONE_LABELS = ['↖', '↑', '↗', '←', '→', '↙', '↘']
// Posicions a la graella 3×3: número = índex de zona; null = cel·la buida.
const GRID: (number | null)[] = [0, 1, 2, 3, null, 4, 5, null, 6]

interface Props {
  state: PenalsState
  teams: TrivialTeam[]
  mode: 'host' | 'player'
  myTeamId?: string | null
  onChoose?: (zone: number) => void
}

export default function PenalsView({ state, teams, mode, myTeamId, onChoose }: Props) {
  const name = (id: string | null) => teams.find((t) => t.id === id)?.name ?? '—'
  const m = state.matches[state.mi]
  if (!m) return <p className="pk-msg">Preparant el duel…</p>
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
  const canPick = mode === 'player' && !!myRole && !myChosen && !isResult

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
      </p>

      <div className="pk-goal">
        {GRID.map((z, cell) => {
          if (z === null) return <span key={`e${cell}`} className="pk-empty" />
          const shootHere = isResult && state.shoot === z
          const keepHere = isResult && state.keep === z
          return (
            <button
              key={z}
              className={`pk-zone${shootHere ? ' shoot' : ''}${keepHere ? ' keep' : ''}`}
              disabled={!canPick}
              onClick={() => canPick && onChoose?.(z)}
            >
              {shootHere && '⚽'}
              {keepHere && '🧤'}
              {!shootHere && !keepHere && <span className="pk-lab">{ZONE_LABELS[z]}</span>}
            </button>
          )
        })}
      </div>

      {isResult ? (
        <p className={`pk-result ${state.lastResult?.goal ? 'goal' : 'save'}`}>
          {state.lastResult?.goal ? '⚽ GOL!' : '🧤 ATURADA!'}
        </p>
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
