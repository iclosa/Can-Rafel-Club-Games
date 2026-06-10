import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
// HTTPS al dev server: Spotify exigeix Redirect URIs amb https (excepte el
// loopback 127.0.0.1). Amb https el QR pot apuntar a la IP de LAN i els mòbils
// s'hi connecten; a més, crypto.subtle torna a estar disponible (context segur).
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true, // exposa a la LAN (equival a --host)
  },
})
