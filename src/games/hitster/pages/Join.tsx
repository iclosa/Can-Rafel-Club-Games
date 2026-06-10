import '../hitster.css'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { joinGame, NicknameTakenError } from '../services/gameService'

export default function Join() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const join = async () => {
    if (!name.trim() || !code || busy) return
    setBusy(true)
    setError(null)
    try {
      const player = await joinGame(code, name)
      localStorage.setItem(`hitster:playerId:${code}`, player.id)
      navigate(`/hitster/play/${code}`)
    } catch (e) {
      if (e instanceof NicknameTakenError) setError('Aquest nom d\'equip ja s\'està utilitzant.')
      else setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <div className="join">
      <header className="join-header">
        <h1 className="join-logo">HITSTER</h1>
        <p className="join-room">
          Sala <strong>{code}</strong>
        </p>
      </header>

      <main className="join-form">
        <label htmlFor="name">Nom de l'equip</label>
        <input
          id="name"
          type="text"
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          placeholder="Nom de l'equip"
          maxLength={20}
          onKeyDown={(e) => e.key === 'Enter' && join()}
        />
        {error && <p className="join-error">{error}</p>}
        <button className="join-btn" onClick={join} disabled={!name.trim() || busy}>
          {busy ? 'Entrant…' : 'Entra'}
        </button>
      </main>
    </div>
  )
}
