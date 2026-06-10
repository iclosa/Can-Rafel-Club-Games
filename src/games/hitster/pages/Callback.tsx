import '../hitster.css'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleSpotifyCallback } from '../lib/spotify/auth'

// Llegeix els paràmetres de retorn de l'OAuth de forma síncrona (fora de l'efecte).
function readCallbackParams(): { code: string | null; error: string | null } {
  const params = new URLSearchParams(window.location.search)
  const authError = params.get('error')
  const code = params.get('code')
  if (authError) return { code: null, error: `Spotify ha denegat l'accés: ${authError}` }
  if (!code) return { code: null, error: "No s'ha rebut cap codi d'autorització." }
  return { code, error: null }
}

// Pàgina de retorn de l'OAuth de Spotify. Intercanvia el code pel token i
// torna a la pantalla d'on venia (o a /).
export default function Callback() {
  const navigate = useNavigate()
  const [{ code, error: initialError }] = useState(readCallbackParams)
  const [error, setError] = useState<string | null>(initialError)
  const done = useRef(false)

  useEffect(() => {
    if (done.current || !code) return
    done.current = true

    handleSpotifyCallback(code)
      .then(() => {
        const back = sessionStorage.getItem('hitster:returnTo') ?? '/'
        sessionStorage.removeItem('hitster:returnTo')
        navigate(back, { replace: true })
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [code, navigate])

  return (
    <div className="screen">
      {error ? (
        <div className="card">
          <h2>Error d'autenticació</h2>
          <p className="muted">{error}</p>
          <button className="primary" onClick={() => navigate('/hitster')}>
            Tornar a l'inici
          </button>
        </div>
      ) : (
        <p className="subtitle">Connectant amb Spotify…</p>
      )}
    </div>
  )
}
