// Tipus mínims del Spotify Web Playback SDK (carregat via <script>).
// Cobreix només el que fem servir.

export {}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void
    Spotify: typeof Spotify
  }

  namespace Spotify {
    interface PlayerInit {
      name: string
      getOAuthToken: (cb: (token: string) => void) => void
      volume?: number
    }

    interface WebPlaybackError {
      message: string
    }

    interface PlaybackState {
      paused: boolean
      position: number
      duration: number
      track_window: {
        current_track: {
          id: string
          uri: string
          name: string
          artists: { name: string }[]
        }
      }
    }

    interface Player {
      connect(): Promise<boolean>
      disconnect(): void
      addListener(event: 'ready' | 'not_ready', cb: (d: { device_id: string }) => void): void
      addListener(
        event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error',
        cb: (d: WebPlaybackError) => void
      ): void
      addListener(event: 'player_state_changed', cb: (s: PlaybackState | null) => void): void
      removeListener(event: string): void
      pause(): Promise<void>
      resume(): Promise<void>
      togglePlay(): Promise<void>
      getCurrentState(): Promise<PlaybackState | null>
    }

    const Player: {
      new (init: PlayerInit): Player
    }
  }
}
