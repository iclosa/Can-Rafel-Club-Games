import './karaoke.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpotifyAuth } from '../../shared/useSpotifyAuth'
import { useSpotifyPlayer } from '../../shared/useSpotifyPlayer'
import { fetchKaraokeSongs, type KSong } from './karaokeService'
import { fetchLyrics, type Lyrics } from './lrclib'

export default function Karaoke() {
  const navigate = useNavigate()
  const { configured, authenticated, login } = useSpotifyAuth()
  const { ready, play, pause, resume, nowPlaying, getPosition } = useSpotifyPlayer()

  const [songs, setSongs] = useState<KSong[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<KSong | null>(null)
  const [lyrics, setLyrics] = useState<{ songId: string; data: Lyrics } | null>(null)
  const [posMs, setPosMs] = useState(0)

  useEffect(() => {
    fetchKaraokeSongs().then(setSongs).catch((e) => console.error('[karaoke] songs', e))
  }, [])

  // Reprodueix la cançó seleccionada i carrega la lletra.
  const playedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!selected || !ready || !selected.audio_url) return
    if (playedRef.current === selected.id) return
    playedRef.current = selected.id
    play(selected.audio_url).catch((e) => console.error('[karaoke] play', e))
  }, [selected, ready, play])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    const id = selected.id
    fetchLyrics(selected.song_title, selected.artist).then((d) => {
      if (!cancelled) setLyrics({ songId: id, data: d })
    })
    return () => {
      cancelled = true
    }
  }, [selected])

  // Posició interpolada (per ressaltar la línia).
  const getPosRef = useRef(getPosition)
  useEffect(() => {
    getPosRef.current = getPosition
  })
  useEffect(() => {
    if (!selected) return
    const t = setInterval(() => setPosMs(getPosRef.current()), 150)
    return () => clearInterval(t)
  }, [selected])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return songs
    return songs.filter(
      (s) => s.song_title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    )
  }, [songs, query])

  const lyricsReady = Boolean(selected && lyrics && lyrics.songId === selected.id)
  const data = lyricsReady && lyrics ? lyrics.data : null
  const lyricsLoading = Boolean(selected) && !lyricsReady
  const synced = data?.synced ?? null
  let cur = -1
  if (synced) {
    for (let i = 0; i < synced.length; i++) {
      if (synced[i].time <= posMs + 200) cur = i
      else break
    }
  }
  const activeRef = useRef<HTMLParagraphElement | null>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [cur])

  // Línia actual i la següent, per al plafó destacat "Ara canta".
  const curLine = synced && cur >= 0 ? synced[cur] : null
  const nextLine = synced && cur + 1 < synced.length ? synced[cur + 1] : null
  // Compte enrere fins a la línia següent (per anticipar-se a cantar).
  const msToNext = nextLine ? Math.max(0, nextLine.time - posMs) : null
  const startingSoon = msToNext != null && msToNext <= 1200

  const backToList = () => {
    pause().catch(() => {})
    playedRef.current = null
    setSelected(null)
    setLyrics(null)
  }

  // ── Estats inicials ──
  if (!configured) {
    return (
      <Shell onBack={() => navigate('/')}>
        <p className="kar-msg">Falta configurar Spotify (VITE_SPOTIFY_CLIENT_ID).</p>
      </Shell>
    )
  }
  if (!authenticated) {
    return (
      <Shell onBack={() => navigate('/')}>
        <p className="kar-msg">Connecta Spotify (Premium) per cantar.</p>
        <button className="kar-btn" onClick={login}>Connecta amb Spotify</button>
      </Shell>
    )
  }

  // ── Selector de cançó ──
  if (!selected) {
    return (
      <Shell onBack={() => navigate('/')}>
        <input
          className="kar-search"
          placeholder="Cerca una cançó o artista…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="kar-songlist">
          {filtered.map((s) => (
            <li key={s.id}>
              <button onClick={() => setSelected(s)}>
                <span className="kar-song-title">{s.song_title}</span>
                <span className="kar-song-artist">{s.artist}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="kar-msg">Cap cançó. Sincronitza el catàleg.</li>}
        </ul>
      </Shell>
    )
  }

  // ── Pantalla de karaoke ──
  return (
    <div className="kar kar--sing">
      <div className="kar-bar">
        <button className="kar-icon" onClick={backToList}>← Cançons</button>
        <div className="kar-nowinfo">
          <strong>{selected.song_title}</strong>
          <span>{selected.artist}</span>
        </div>
        <button className="kar-icon" onClick={() => void (nowPlaying?.paused ? resume() : pause())}>
          {nowPlaying?.paused ? '▶️' : '⏸'}
        </button>
      </div>

      {!lyricsLoading && synced && (
        <div className="kar-focus">
          <span className="kar-focus-label">🎤 Ara canta</span>
          <p className={`kar-focus-cur${curLine ? '' : ' waiting'}`}>
            {curLine ? curLine.text || '♪' : '♪ …'}
          </p>
          {nextLine && (
            <p className={`kar-focus-next${startingSoon ? ' soon' : ''}`}>
              {startingSoon && '▶ '}
              {nextLine.text || '♪'}
            </p>
          )}
        </div>
      )}

      <div className="kar-lyrics">
        {lyricsLoading && <p className="kar-msg">Carregant la lletra…</p>}
        {!lyricsLoading && synced && (
          synced.map((l, i) => (
            <p
              key={i}
              ref={i === cur ? activeRef : undefined}
              className={`kar-line${i === cur ? ' active' : ''}${i < cur ? ' past' : ''}`}
            >
              {l.text || '♪'}
            </p>
          ))
        )}
        {!lyricsLoading && !synced && data?.plain && (
          <pre className="kar-plain">{data.plain}</pre>
        )}
        {!lyricsLoading && !synced && !data?.plain && (
          <p className="kar-msg">No s'ha trobat la lletra d'aquesta cançó 😕<br />Però pots cantar igualment!</p>
        )}
      </div>
    </div>
  )
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="kar">
      <button className="kar-back" onClick={onBack}>← Menú principal</button>
      <header className="kar-head">
        <span className="kar-kicker">Club Esportiu Can Rafel</span>
        <h1 className="kar-logo">KARAOKE</h1>
        <p className="kar-sub">Tria una cançó i canta-la amb la lletra a pantalla</p>
      </header>
      <div className="kar-panel">{children}</div>
    </div>
  )
}
