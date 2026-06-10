// Lletres sincronitzades des de lrclib.net (gratuït, sense clau, amb CORS).
export interface LyricLine {
  time: number // ms
  text: string
}
export interface Lyrics {
  synced: LyricLine[] | null
  plain: string | null
}

const TAG = /\[(\d+):(\d+(?:\.\d+)?)\]/g

function parseLrc(lrc: string): LyricLine[] {
  const out: LyricLine[] = []
  for (const raw of lrc.split('\n')) {
    const text = raw.replace(TAG, '').trim()
    let m: RegExpExecArray | null
    TAG.lastIndex = 0
    while ((m = TAG.exec(raw))) {
      out.push({ time: (parseInt(m[1], 10) * 60 + parseFloat(m[2])) * 1000, text })
    }
  }
  return out.sort((a, b) => a.time - b.time)
}

interface LrcResult {
  syncedLyrics?: string | null
  plainLyrics?: string | null
}

export async function fetchLyrics(
  track: string,
  artist: string,
  durationSec?: number
): Promise<Lyrics> {
  const base = 'https://lrclib.net/api'
  // Neteja "ft."/"feat." de l'artista per millorar la coincidència.
  const cleanArtist = artist.replace(/\s*(ft\.|feat\.).*$/i, '').trim()
  try {
    const params = new URLSearchParams({ track_name: track, artist_name: cleanArtist })
    if (durationSec) params.set('duration', String(Math.round(durationSec)))
    const res = await fetch(`${base}/get?${params.toString()}`)
    if (res.ok) {
      const d = (await res.json()) as LrcResult
      if (d.syncedLyrics || d.plainLyrics) {
        return { synced: d.syncedLyrics ? parseLrc(d.syncedLyrics) : null, plain: d.plainLyrics ?? null }
      }
    }
    // Fallback: cerca difusa
    const sres = await fetch(
      `${base}/search?${new URLSearchParams({ track_name: track, artist_name: cleanArtist }).toString()}`
    )
    if (sres.ok) {
      const arr = (await sres.json()) as LrcResult[]
      const hit = arr.find((x) => x.syncedLyrics) ?? arr[0]
      if (hit) {
        return {
          synced: hit.syncedLyrics ? parseLrc(hit.syncedLyrics) : null,
          plain: hit.plainLyrics ?? null,
        }
      }
    }
  } catch {
    /* xarxa / CORS */
  }
  return { synced: null, plain: null }
}
