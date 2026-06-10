# HITSTER by Club Can Rafel

Joc multijugador estil Kahoot inspirat en **Hitster**: els jugadors escolten cançons i intenten col·locar-les en l'ordre cronològic correcte dins de la seva línia temporal personal.

## Stack

- **Vite + React + TypeScript**
- **react-router-dom** per a la navegació entre pantalles (Home / Host / Player)
- **Supabase Realtime** per a la comunicació en temps real (broadcast + presence en canals per sala)

## Posada en marxa

```bash
npm install
cp .env.example .env   # omple VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY
npm run dev
```

Obre `http://localhost:5173`. Des de la pantalla principal:

- A `/` es genera automàticament un codi de sala i es mostra el QR perquè els jugadors s'uneixin.
- Els jugadors escanegen el QR i entren a `/join/<codi>` per introduir el seu nom.
- L'amfitrió comença la partida i navega a `/host/<codi>`.

## Estructura

```
src/
  lib/
    supabase.ts       # client de Supabase
    roomCode.ts       # generació de codis de sala
  hooks/
    useRoom.ts        # hook de sala (presence + broadcast)
  pages/
    Home.tsx          # lobby amb QR i llista de jugadors
    Join.tsx          # pantalla mòbil per a jugadors
    Host.tsx          # vista de l'amfitrió durant la partida
    Player.tsx        # vista del jugador durant la partida
  types/
    game.ts           # tipus compartits
  App.tsx             # router
```

## Pròxims passos

1. Carregar un catàleg de cançons (Spotify / Deezer / mock local) amb `previewUrl` i `year`.
2. Lògica de rondes a `Host.tsx`: emetre `new_song`, rebre `guess`, calcular puntuació.
3. UI de línia temporal arrossegable a `Player.tsx`.
4. Persistir partides en una taula de Supabase per a historial i rànquing.
