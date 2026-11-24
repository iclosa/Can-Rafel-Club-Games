import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Tests de la UI i la lògica dels jocs. Supabase i Spotify es simulen
// (src/test/setup.ts), així que no cal xarxa ni claus.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
})
