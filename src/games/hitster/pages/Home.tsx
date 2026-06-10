import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobby from '../../../shared/GameLobby'
import { gameTagline } from '../../../shared/gamesCatalog'
import { generateRoomCode } from '../lib/roomCode'
import { useGameSync } from '../hooks/useGameSync'
import { isSupabaseConfigured } from '../lib/supabase'
import { createGame, startGame } from '../services/gameService'

export default function Home() {
  const navigate = useNavigate()
  const code = useMemo(() => generateRoomCode(), [])
  const createdRef = useRef(false)
  const [creating, setCreating] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const { game, players } = useGameSync(code)
  const playerList = players.filter((p) => !p.is_host)

  useEffect(() => {
    if (createdRef.current || !isSupabaseConfigured) return
    createdRef.current = true
    createGame(code)
      .then(({ hostId }) => {
        localStorage.setItem(`hitster:hostId:${code}`, hostId)
        setCreating(false)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [code])

  const start = () => {
    if (!game || starting) return
    setStarting(true)
    setError(null)
    startGame(game.id)
      .then(() => navigate(`/hitster/host/${code}`))
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e))
        setStarting(false)
      })
  }

  return (
    <GameLobby
      theme="hitster"
      title="Hitster"
      subtitle={gameTagline('hitster')}
      code={code}
      joinUrl={`${window.location.origin}/hitster/join/${code}`}
      alert={
        !isSupabaseConfigured ? (
          <div className="globby-alert">Supabase no està configurat (omple .env).</div>
        ) : error ? (
          <div className="globby-alert">{error}</div>
        ) : null
      }
    >
      <h2>Equips ({playerList.length})</h2>
      {playerList.length === 0 ? (
        <p className="globby-muted">{creating ? 'Creant sala…' : 'Esperant equips…'}</p>
      ) : (
        <ul className="globby-list">
          {playerList.map((p) => (
            <li key={p.id} className="globby-chip">
              {p.nickname}
            </li>
          ))}
        </ul>
      )}
      <button className="globby-btn" onClick={start} disabled={creating || starting || playerList.length < 2}>
        {starting ? 'Començant…' : playerList.length < 2 ? 'Calen 2 equips' : 'Comença la partida'}
      </button>
    </GameLobby>
  )
}
