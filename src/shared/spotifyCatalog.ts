// Mapatge del catàleg local (taula `cards`) a tracks de Spotify.
// Per a cada carta sense `audio_url`, cerca títol+artista i hi desa el
// `spotify:track:…`. Es llança un cop (o quan s'afegeixen cançons noves).

import { supabase } from './supabase'
import { searchTrack } from './spotify/api'

interface CardRow {
  id: string
  song_title: string
  artist: string
  audio_url: string | null
}

export interface SyncResult {
  total: number
  matched: number
  missing: { title: string; artist: string }[]
}

export async function syncCatalogWithSpotify(
  onProgress?: (done: number, total: number) => void
): Promise<SyncResult> {
  if (!supabase) throw new Error('Supabase no configurat')

  const { data, error } = await supabase
    .from('songs')
    .select('id, song_title, artist, audio_url')
    .is('audio_url', null)

  if (error) throw error
  const cards = (data ?? []) as CardRow[]
  const result: SyncResult = { total: cards.length, matched: 0, missing: [] }

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    try {
      const track = await searchTrack(card.song_title, card.artist)
      if (track) {
        const { data: updated, error: upErr } = await supabase
          .from('songs')
          .update({ audio_url: track.uri })
          .eq('id', card.id)
          .select('id')
        if (upErr) throw upErr
        if (!updated || updated.length === 0) {
          // RLS o cap fila afectada: NO és un encert real.
          throw new Error('No s\'ha pogut desar (cap fila actualitzada)')
        }
        result.matched++
      } else {
        result.missing.push({ title: card.song_title, artist: card.artist })
      }
    } catch (e) {
      console.error('[catalog] sync error', card.song_title, e)
      result.missing.push({ title: card.song_title, artist: card.artist })
    }
    onProgress?.(i + 1, cards.length)
  }

  return result
}
