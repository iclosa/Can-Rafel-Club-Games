// Client mínim de la Spotify Web API. Totes les crides usen el token de
// l'amfitrió (getSpotifyAccessToken).

import { getSpotifyAccessToken } from './auth'

const API = 'https://api.spotify.com/v1'

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getSpotifyAccessToken()
  if (!token) throw new Error('Sense sessió de Spotify')
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
}

export interface SpotifyTrack {
  uri: string
  id: string
  name: string
  artists: string
}

// Cerca el millor track per a un títol + artista. null si no hi ha resultats.
export async function searchTrack(title: string, artist: string): Promise<SpotifyTrack | null> {
  const q = `track:${title} artist:${artist}`
  const res = await authFetch(`/search?q=${encodeURIComponent(q)}&type=track&limit=1`)
  if (!res.ok) throw new Error(`Error de cerca Spotify: ${res.status}`)
  const data = await res.json()
  const item = data.tracks?.items?.[0]
  if (!item) return null
  return {
    uri: item.uri,
    id: item.id,
    name: item.name,
    artists: item.artists.map((a: { name: string }) => a.name).join(', '),
  }
}

// Inicia la reproducció d'un track al dispositiu del Web Playback SDK.
export async function playTrack(deviceId: string, trackUri: string): Promise<void> {
  const res = await authFetch(`/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [trackUri] }),
  })
  if (!res.ok && res.status !== 204) {
    throw new Error(`No s'ha pogut reproduir: ${res.status}`)
  }
}
