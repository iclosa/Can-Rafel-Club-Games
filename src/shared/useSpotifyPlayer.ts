import { useEffect, useRef, useState } from 'react'
import { getSpotifyAccessToken, isSpotifyAuthenticated } from './spotify/auth'
import { playTrack as apiPlayTrack } from './spotify/api'

const SDK_SRC = 'https://sdk.scdn.co/spotify-player.js'

let sdkLoading: Promise<void> | null = null

// Carrega el script del Web Playback SDK una sola vegada.
function loadSdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve()
  if (sdkLoading) return sdkLoading
  sdkLoading = new Promise<void>((resolve) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve()
    const script = document.createElement('script')
    script.src = SDK_SRC
    script.async = true
    document.body.appendChild(script)
  })
  return sdkLoading
}

export interface NowPlaying {
  name: string
  artists: string
  paused: boolean
}

// Inicialitza un reproductor de Spotify a l'amfitrió i exposa accions.
// Només té efecte si hi ha sessió de Spotify.
export function useSpotifyPlayer() {
  const [ready, setReady] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const playerRef = useRef<Spotify.Player | null>(null)
  // Seguiment de posició per a la lletra del karaoke (interpolada entre events).
  const posRef = useRef(0)
  const durRef = useRef(0)
  const pausedRef = useRef(true)
  const tsRef = useRef(0)

  useEffect(() => {
    if (!isSpotifyAuthenticated()) return
    let cancelled = false

    loadSdk().then(() => {
      if (cancelled) return
      const player = new window.Spotify.Player({
        name: 'HITSTER · Club Can Rafel',
        getOAuthToken: (cb) => {
          getSpotifyAccessToken().then((t) => t && cb(t))
        },
        volume: 0.8,
      })
      playerRef.current = player

      player.addListener('ready', ({ device_id }) => {
        if (cancelled) return
        setDeviceId(device_id)
        setReady(true)
      })
      player.addListener('not_ready', () => setReady(false))
      player.addListener('authentication_error', ({ message }) => setError(message))
      player.addListener('account_error', () =>
        setError('Cal un compte de Spotify Premium per reproduir.')
      )
      player.addListener('playback_error', ({ message }) => setError(message))
      player.addListener('player_state_changed', (state) => {
        if (!state) {
          setNowPlaying(null)
          return
        }
        const t = state.track_window.current_track
        setNowPlaying({
          name: t.name,
          artists: t.artists.map((a) => a.name).join(', '),
          paused: state.paused,
        })
        posRef.current = state.position
        durRef.current = state.duration
        pausedRef.current = state.paused
        tsRef.current = Date.now()
      })

      player.connect()
    })

    return () => {
      cancelled = true
      playerRef.current?.disconnect()
      playerRef.current = null
    }
  }, [])

  const play = async (trackUri: string) => {
    if (!deviceId) throw new Error('Reproductor encara no preparat')
    await apiPlayTrack(deviceId, trackUri)
  }
  const pause = async () => {
    await playerRef.current?.pause()
  }
  const resume = async () => {
    await playerRef.current?.resume()
  }
  // Posició actual (ms) interpolada entre events del SDK.
  const getPosition = () => {
    if (pausedRef.current) return posRef.current
    return Math.min(durRef.current || Infinity, posRef.current + (Date.now() - tsRef.current))
  }

  return { ready, deviceId, error, nowPlaying, play, pause, resume, getPosition }
}
