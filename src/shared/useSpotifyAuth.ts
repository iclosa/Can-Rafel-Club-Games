import { useCallback, useState } from 'react'
import {
  isSpotifyAuthenticated,
  isSpotifyConfigured,
  loginWithSpotify,
  logoutSpotify,
} from './spotify/auth'

// Estat de sessió de Spotify per a la UI de l'amfitrió.
export function useSpotifyAuth() {
  const [authenticated, setAuthenticated] = useState(() => isSpotifyAuthenticated())

  const login = useCallback(() => {
    // Recorda la pantalla actual perquè /callback hi torni després del login.
    sessionStorage.setItem('hitster:returnTo', window.location.pathname + window.location.search)
    loginWithSpotify().catch((e) => console.error('[spotify] login', e))
  }, [])

  const logout = useCallback(() => {
    logoutSpotify()
    setAuthenticated(false)
  }, [])

  return {
    configured: isSpotifyConfigured,
    authenticated,
    login,
    logout,
  }
}
