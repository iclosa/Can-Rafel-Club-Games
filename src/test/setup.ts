import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cap test parla amb Supabase de veritat.
vi.mock('../shared/supabase', () => ({ supabase: null, isSupabaseConfigured: false }))

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})
