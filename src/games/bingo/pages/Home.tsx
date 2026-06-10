import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobby from '../../../shared/GameLobby'
import { gameTagline } from '../../../shared/gamesCatalog'
import { generateRoomCode } from '../../../shared/roomCode'
import { isSupabaseConfigured } from '../../../shared/supabase'
import { useBingoSync } from '../useBingoSync'
import { createBingoGame, generateBingoCards, startBingo } from '../bingoService'

export default function BingoHome() {
  const navigate = useNavigate()
  const code = useMemo(() => generateRoomCode(), [])
  const createdRef = useRef(false)
  const [creating, setCreating] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cardCount, setCardCount] = useState(10)
  const [generating, setGenerating] = useState(false)

  const { game, players } = useBingoSync(code)
  const playerList = players.filter((p) => !p.is_host)

  useEffect(() => {
    if (createdRef.current || !isSupabaseConfigured) return
    createdRef.current = true
    createBingoGame(code)
      .then(({ hostId }) => {
        localStorage.setItem(`bingo:hostId:${code}`, hostId)
        setCreating(false)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [code])

  const makeCards = async () => {
    if (!game || generating) return
    setGenerating(true)
    try {
      await generateBingoCards(game.id, cardCount)
      navigate(`/bingo/print/${code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerating(false)
    }
  }

  const start = async () => {
    if (!game) return
    try {
      await startBingo(game.id)
      navigate(`/bingo/host/${code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <GameLobby
      theme="bingo"
      title="Bingo Musical"
      subtitle={gameTagline('bingo')}
      code={code}
      joinUrl={`${window.location.origin}/bingo/join/${code}`}
      qrHint="Escaneja per jugar amb cartró al mòbil"
      alert={error ? <div className="globby-alert">{error}</div> : null}
    >
      <h2>Cartrons digitals ({playerList.length})</h2>
      {playerList.length === 0 ? (
        <p className="globby-muted">{creating ? 'Creant sala…' : 'Encara ningú…'}</p>
      ) : (
        <ul className="globby-list">
          {playerList.map((p) => (
            <li key={p.id} className="globby-chip">
              {p.nickname}
            </li>
          ))}
        </ul>
      )}

      <div className="globby-row">
        <input
          className="globby-input"
          type="number"
          min={1}
          max={100}
          value={cardCount}
          onChange={(e) => setCardCount(Math.max(1, Number(e.target.value) || 1))}
        />
        <button className="globby-secondary" onClick={makeCards} disabled={creating || generating}>
          {generating ? 'Generant…' : 'Genera cartrons per imprimir'}
        </button>
      </div>

      <button className="globby-btn" onClick={start} disabled={creating}>
        Comença la partida
      </button>
    </GameLobby>
  )
}
