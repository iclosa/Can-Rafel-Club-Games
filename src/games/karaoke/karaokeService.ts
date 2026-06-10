import { supabase } from '../../shared/supabase'

export interface KSong {
  id: string
  song_title: string
  artist: string
  audio_url: string | null
}

// Cançons del catàleg compartit amb àudio (reproduïbles).
export async function fetchKaraokeSongs(): Promise<KSong[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('songs')
    .select('id, song_title, artist, audio_url')
    .not('audio_url', 'is', null)
    .order('song_title')
  if (error) throw error
  return (data ?? []) as KSong[]
}
