import '../bingo.css'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BingoNicknameTakenError, joinBingo } from '../bingoService'

export default function BingoJoin() {
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
      const { playerId } = await joinBingo(code, name)
      localStorage.setItem(`bingo:playerId:${code}`, playerId)
      navigate(`/bingo/play/${code}`)
    } catch (e) {
      if (e instanceof BingoNicknameTakenError) setError('Aquest nom ja s\'està utilitzant.')
      else setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <div className="bingo bingo--join">
      <header className="bingo-head">
        <h1 className="bingo-logo">
          BINGO <span>MUSICAL</span>
        </h1>
        <p className="bingo-room">
          Sala <strong>{code}</strong>
        </p>
      </header>

      <div className="bingo-joinform">
        <label htmlFor="nick">El teu nom</label>
        <input
          id="nick"
          autoFocus
          value={name}
          maxLength={20}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          placeholder="El teu nom"
        />
        {error && <p className="bingo-error">{error}</p>}
        <button onClick={join} disabled={!name.trim() || busy}>
          {busy ? 'Entrant…' : 'Agafa cartró'}
        </button>
      </div>
    </div>
  )
}
