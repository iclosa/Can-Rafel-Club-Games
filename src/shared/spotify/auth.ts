// Autenticació amb Spotify mitjançant OAuth Authorization Code + PKCE.
// L'amfitrió (pantalla gran) inicia sessió amb un compte Premium; el token
// resultant alimenta el Web Playback SDK i la Web API (cerca de tracks).

import { sha256 } from './sha256'

const CLIENT_ID = (import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? '').trim()
const REDIRECT_URI = `${window.location.origin}/callback`
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ')

const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize'
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'

const TOKEN_KEY = 'hitster:spotify:token'
const VERIFIER_KEY = 'hitster:spotify:verifier'

export const isSpotifyConfigured = Boolean(CLIENT_ID)

interface StoredToken {
  access_token: string
  refresh_token: string
  expires_at: number // epoch ms
}

// ── PKCE helpers ────────────────────────────────────────────────────────────
function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (v) => chars[v % chars.length]).join('')
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function challengeFromVerifier(verifier: string): Promise<string> {
  const input = new TextEncoder().encode(verifier)
  // crypto.subtle només existeix en contextos segurs (https / localhost).
  // Per LAN sobre http (proves amb mòbils) caiem al SHA-256 en JS pur.
  const digest = crypto.subtle
    ? new Uint8Array(await crypto.subtle.digest('SHA-256', input))
    : sha256(input)
  return base64url(digest)
}

// ── Emmagatzematge del token ─────────────────────────────────────────────────
function readToken(): StoredToken | null {
  const raw = localStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredToken
  } catch {
    return null
  }
}

function writeToken(t: StoredToken) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
}

export function logoutSpotify() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(VERIFIER_KEY)
}

export function isSpotifyAuthenticated(): boolean {
  return readToken() !== null
}

// ── Flux de login ────────────────────────────────────────────────────────────
export async function loginWithSpotify(): Promise<void> {
  if (!CLIENT_ID) throw new Error('Falta VITE_SPOTIFY_CLIENT_ID')
  const verifier = randomString(64)
  localStorage.setItem(VERIFIER_KEY, verifier)
  const challenge = await challengeFromVerifier(verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })
  window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`
}

// Es crida a la pàgina /callback. Intercanvia el code pel token.
export async function handleSpotifyCallback(code: string): Promise<void> {
  const verifier = localStorage.getItem(VERIFIER_KEY)
  if (!verifier) throw new Error('Falta el code_verifier (sessió de login perduda)')

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  })

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Error obtenint el token: ${res.status}`)
  const data = await res.json()
  writeToken({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  })
  localStorage.removeItem(VERIFIER_KEY)
}

async function refreshAccessToken(token: StoredToken): Promise<StoredToken> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token,
  })
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    logoutSpotify()
    throw new Error(`No s'ha pogut refrescar el token: ${res.status}`)
  }
  const data = await res.json()
  const next: StoredToken = {
    access_token: data.access_token,
    // Spotify pot NO retornar un refresh_token nou; reutilitzem l'anterior.
    refresh_token: data.refresh_token ?? token.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
  writeToken(next)
  return next
}

// Retorna un access_token vàlid, refrescant-lo si cal. null si no hi ha sessió.
export async function getSpotifyAccessToken(): Promise<string | null> {
  let token = readToken()
  if (!token) return null
  // Marge de 60s per evitar caducitat a mig vol.
  if (Date.now() > token.expires_at - 60_000) {
    token = await refreshAccessToken(token)
  }
  return token.access_token
}
