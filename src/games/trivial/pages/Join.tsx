import '../trivial.css'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { joinTrivial } from '../trivialService'

export default function TrivialJoin() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [team, setTeam] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const join = async () => {
    if (!team.trim() || !code || busy) return
    setBusy(true)
    setError(null)
    try {
      const { teamId } = await joinTrivial(code, team)
      localStorage.setItem(`trivial:teamId:${code}`, teamId)
      navigate(`/trivial/play/${code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <div className="triv triv--join">
      <header className="triv-head">
        <h1 className="triv-logo triv-logo--sm">TRIVIAL PARTY</h1>
        <p className="triv-room">Sala <strong>{code}</strong></p>
      </header>

      <div className="triv-joinform">
        <label>Nom de l'equip</label>
        <input
          value={team}
          maxLength={24}
          autoFocus
          onChange={(e) => { setTeam(e.target.value); setError(null) }}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          placeholder="Nom de l'equip"
        />
        {error && <p className="triv-error">{error}</p>}
        <button onClick={join} disabled={!team.trim() || busy}>
          {busy ? 'Entrant…' : 'Entra'}
        </button>
      </div>
    </div>
  )
}
