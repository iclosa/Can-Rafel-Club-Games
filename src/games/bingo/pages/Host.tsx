import '../bingo.css'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBingoSync } from '../useBingoSync'
import { callNextSong } from '../bingoService'
import { useSpotifyAuth } from '../../../shared/useSpotifyAuth'
import { useSpotifyPlayer } from '../../../shared/useSpotifyPlayer'
import { syncCatalogWithSpotify } from '../../../shared/spotifyCatalog'

export default function BingoHost() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { game, called, wins, loading } = useBingoSync(code ?? null)
  const { configured, authenticated, login } = useSpotifyAuth()
  const { ready, play, pause, resume, nowPlaying } = useSpotifyPlayer()

  const [showTitle, setShowTitle] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [noMore, setNoMore] = useState(false)

  const currentSong = called.find((c) => c.song_id === game?.current_song_id)?.song ?? null
  const status = game?.status

  // Reprodueix la bola actual quan canvia.
  const playedRef = useRef<string | null>(null)
  useEffect(() => {
    if (status !== 'playing' || !currentSong?.audio_url || !ready) return
    if (playedRef.current === currentSong.id) return
    playedRef.current = currentSong.id
    setShowTitle(false)
    play(currentSong.audio_url).catch((e) => console.error('[bingo] play', e))
  }, [status, currentSong?.id, currentSong?.audio_url, ready, play])

  const next = async () => {
    if (!game) return
    const song = await callNextSong(game.id).catch((e) => {
      console.error('[bingo] next', e)
      return undefined
    })
    if (song === null) setNoMore(true)
  }

  const runSync = async () => {
    setSyncing(true)
    try {
      await syncCatalogWithSpotify()
    } catch (e) {
      console.error('[bingo] sync', e)
    } finally {
      setSyncing(false)
    }
  }

  const bingoWin = wins.find((w) => w.kind === 'bingo')
  const lineWins = wins.filter((w) => w.kind === 'line')
  // Boles ja revelades (totes menys la que sona ara, llevat que el host la mostri).
  const board = [...called].reverse()

  return (
    <div className="bingo bingo--host">
      <button className="bingo-back" onClick={() => navigate('/')}>
        ← Menú principal
      </button>

      <header className="bingo-head bingo-head--sm">
        <h1 className="bingo-logo bingo-logo--sm">
          BINGO <span>MUSICAL</span>
        </h1>
        <p className="bingo-room">
          Sala {code} · {called.length} boles cantades
        </p>
      </header>

      {loading && <p className="bingo-muted">Carregant…</p>}

      {!configured && <div className="bingo-alert">Falta VITE_SPOTIFY_CLIENT_ID.</div>}
      {configured && !authenticated && (
        <div className="bingo-panel bingo-spotify">
          <p>Connecta Spotify (Premium) per reproduir les cançons.</p>
          <button onClick={login}>Connecta amb Spotify</button>
        </div>
      )}

      {status === 'finished' && (
        <div className="bingo-win-screen">
          🏆 BINGO! Guanya <strong>{bingoWin?.nickname ?? '—'}</strong>
        </div>
      )}

      {status === 'playing' && (
        <>
          <div className="bingo-now">
            {noMore ? (
              <p className="bingo-now-label">S'han acabat les cançons</p>
            ) : currentSong ? (
              <>
                <p className="bingo-now-label">🎵 Sona la bola nº {called.length}</p>
                {showTitle ? (
                  <p className="bingo-now-title">
                    {currentSong.song_title} — {currentSong.artist}
                  </p>
                ) : (
                  <button className="bingo-reveal" onClick={() => setShowTitle(true)}>
                    Mostra el títol
                  </button>
                )}
                {!currentSong.audio_url && (
                  <p className="bingo-muted">Sense àudio. Sincronitza el catàleg.</p>
                )}
                <div className="bingo-row bingo-controls">
                  <button onClick={() => void pause()} disabled={!ready}>
                    ⏸
                  </button>
                  <button onClick={() => void resume()} disabled={!ready}>
                    ▶️
                  </button>
                  {nowPlaying?.paused === false && <span className="bingo-muted">sonant</span>}
                </div>
              </>
            ) : (
              <p className="bingo-now-label">Prem «Següent bola» per començar</p>
            )}

            <button className="bingo-next" onClick={next} disabled={noMore || !ready}>
              Següent bola 🎲
            </button>
            {authenticated && (
              <button className="bingo-sync" onClick={runSync} disabled={syncing}>
                {syncing ? 'Sincronitzant…' : 'Sincronitza catàleg'}
              </button>
            )}
          </div>

          {lineWins.length > 0 && (
            <div className="bingo-wins">
              ✅ Línia: {lineWins.map((w) => w.nickname).join(', ')}
            </div>
          )}

          <h2 className="bingo-board-title">Boles cantades</h2>
          <div className="bingo-board">
            {board.map((c) => (
              <span
                key={c.id}
                className={`bingo-ball${c.song_id === game?.current_song_id ? ' current' : ''}`}
              >
                <strong>{c.ord}</strong>
                {c.song_id === game?.current_song_id && !showTitle
                  ? ' 🎵'
                  : ` ${c.song?.song_title}`}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
