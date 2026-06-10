import type { BombaState, TrivialTeam } from './types'

interface Props {
  state: BombaState
  teams: TrivialTeam[]
  mode: 'host' | 'player'
  myTeamId?: string | null
  onPass?: () => void
}

export default function BombaView({ state, teams, mode, myTeamId, onPass }: Props) {
  const name = (id: string | null | undefined) => teams.find((t) => t.id === id)?.name ?? '—'
  const holder = state.alive[state.turnIdx] ?? null
  const isHolder = mode === 'player' && myTeamId === holder

  return (
    <div className="bomba">
      <p className="bomba-cat">Digueu… <strong>{state.category}</strong></p>
      <div className={`bomba-ball${isHolder ? ' mine' : ''}`}>💣</div>
      <p className="bomba-holder">
        La té: <strong>{name(holder)}</strong>
      </p>

      {mode === 'player' ? (
        isHolder ? (
          <button className="bomba-pass" onClick={onPass}>
            Digues-ne un i PASSA 💥
          </button>
        ) : (
          <p className="triv-muted">Atent… que no t'esclati a les mans!</p>
        )
      ) : (
        <div className="bomba-alive">
          {state.alive.map((id) => (
            <span key={id} className={`bomba-chip${id === holder ? ' holder' : ''}`}>
              {name(id)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
