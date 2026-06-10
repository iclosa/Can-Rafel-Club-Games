import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobby from '../../../shared/GameLobby'
import { gameTagline } from '../../../shared/gamesCatalog'
import { generateRoomCode } from '../../../shared/roomCode'
import { isSupabaseConfigured } from '../../../shared/supabase'
import { useTrivialSync } from '../useTrivialSync'
import { createTrivialGame, startTrivial } from '../trivialService'

export default function TrivialHome() {
  const navigate = useNavigate()
  const code = useMemo(() => generateRoomCode(), [])
  const createdRef = useRef(false)
  const [creating, setCreating] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { game, teams } = useTrivialSync(code)

  useEffect(() => {
    if (createdRef.current || !isSupabaseConfigured) return
    createdRef.current = true
    createTrivialGame(code)
      .then(({ hostId }) => {
        localStorage.setItem(`trivial:hostId:${code}`, hostId)
        setCreating(false)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [code])

  const start = () => {
    if (!game) return
    startTrivial(game.id)
      .then(() => navigate(`/trivial/host/${code}`))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }

  return (
    <GameLobby
      theme="trivial"
      title="Trivial Party"
      subtitle={gameTagline('trivial')}
      code={code}
      joinUrl={`${window.location.origin}/trivial/join/${code}`}
      qrHint="Escaneja i posa el nom del teu equip"
      alert={error ? <div className="globby-alert">{error}</div> : null}
    >
      <h2>Equips ({teams.length})</h2>
      {teams.length === 0 ? (
        <p className="globby-muted">{creating ? 'Creant sala…' : 'Esperant equips…'}</p>
      ) : (
        <ul className="globby-list">
          {teams.map((t) => (
            <li key={t.id} className="globby-chip">
              {t.name}
            </li>
          ))}
        </ul>
      )}
      <button className="globby-btn" onClick={start} disabled={creating || teams.length < 2}>
        {teams.length < 2 ? 'Calen 2 equips' : 'Comença la partida'}
      </button>
    </GameLobby>
  )
}
