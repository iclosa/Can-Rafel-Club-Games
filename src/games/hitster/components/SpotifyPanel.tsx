import { useState } from 'react'
import { useSpotifyAuth } from '../hooks/useSpotifyAuth'
import { syncCatalogWithSpotify, type SyncResult } from '../services/spotifyCatalog'

// Configuració de Spotify per a l'amfitrió: login i sincronització del catàleg.
// La reproducció real la gestiona el Host (useSpotifyPlayer), no aquest panell.
export default function SpotifyPanel() {
  const { configured, authenticated, login, logout } = useSpotifyAuth()
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<SyncResult | null>(null)

  if (!configured) {
    return (
      <div className="card hint">
        <p className="muted">Falta VITE_SPOTIFY_CLIENT_ID a .env per activar Spotify.</p>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="card">
        <h2>Spotify</h2>
        <p className="muted">Inicia sessió amb un compte Premium per reproduir les cançons.</p>
        <button className="primary" onClick={login}>
          Connecta amb Spotify
        </button>
      </div>
    )
  }

  const runSync = async () => {
    setSyncing(true)
    setResult(null)
    setProgress({ done: 0, total: 0 })
    try {
      const r = await syncCatalogWithSpotify((done, total) => setProgress({ done, total }))
      setResult(r)
    } catch (e) {
      console.error('[catalog] sync', e)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="card">
      <h2>Spotify</h2>
      <p className="muted">✅ Sessió iniciada.</p>

      <button className="primary" onClick={runSync} disabled={syncing}>
        {syncing ? 'Sincronitzant…' : 'Sincronitza catàleg amb Spotify'}
      </button>
      {progress && syncing && (
        <p className="muted">
          {progress.done}/{progress.total} cançons…
        </p>
      )}
      {result && (
        <p className="muted">
          ✅ {result.matched}/{result.total} mapades.
          {result.missing.length > 0 && ` Sense resultat: ${result.missing.length}.`}
        </p>
      )}

      <hr />
      <button onClick={logout}>Tanca sessió de Spotify</button>
    </div>
  )
}
