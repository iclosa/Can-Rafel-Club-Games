# Can Rafel Club Games

Col·lecció de jocs de festa multijugador del **Club Esportiu Can Rafel**. Des de la
pàgina inicial es tria un joc; cada joc té el seu propi estil i pantalla d'amfitrió
(projector/TV) + mòbils dels jugadors.

## Jocs

- **🎵 Hitster** — escolta una cançó i col·loca-la a la línia temporal segons l'any.
  Equips, comodins/fitxes, robatori i bonus d'artista+cançó.
- **🎱 Bingo Musical** — híbrid: cartró digital al mòbil **i** cartrons imprimibles
  (PDF); l'amfitrió fa de "bombo" amb Spotify. Línia i bingo.
- **🧠 Trivial Party** — equips, 7 rondes de preguntes per categories (puntuació per
  rapidesa) + 3 minijocs aleatoris d'un pool: cursa de cavalls, penals, la bomba i
  endevina amb emojis.
- **🎤 Karaoke** — tria una cançó (Spotify) i canta-la amb la **lletra sincronitzada**
  (lrclib.net).

## Stack

- **Vite + React + TypeScript** (`react-router-dom`)
- **Supabase** — Postgres (font de veritat), Realtime (`postgres_changes`) i funcions
  PL/pgSQL (RPCs) per a la lògica de joc.
- **Spotify Web Playback SDK** per reproduir cançons senceres (l'amfitrió necessita
  compte Premium).

## Posada en marxa

```bash
npm install
cp .env.example .env   # omple els valors (veure sota)
npm run dev            # serveix per HTTPS a la LAN (cal per a Spotify i els QR)
```

Variables d'entorn (`.env`):

```
VITE_SUPABASE_URL=...          # Supabase → Settings → API
VITE_SUPABASE_ANON_KEY=...     # clau publishable / anon
VITE_SPOTIFY_CLIENT_ID=...     # developer.spotify.com → la teva app
VITE_MAX_PLAYERS=8             # límit de jugadors al Trivial (buit = sense límit)
```

> Spotify: afegeix els **Redirect URIs** `https://localhost:5173/callback`, el de la
> IP de LAN i el del desplegament (`https://<projecte>.vercel.app/callback`).

## Estructura

```
src/
  landing/            # menú de selecció de joc
  shared/             # infra comuna: supabase, spotify, useGameLobby, gamesCatalog…
  games/
    hitster/          # cada joc: pages/, components/, hooks/, services/, <joc>.css
    bingo/
    trivial/
    karaoke/
supabase/             # esquema SQL de referència
```

Cada joc porta el seu prefix de ruta (`/hitster`, `/bingo`, `/trivial`, `/karaoke`)
i el seu estil propi; els lobbys comparteixen dimensions (`shared/GameLobby`).

## Desplegament

SPA a Vercel (preset **Vite**, output `dist`). El `vercel.json` afegeix les *rewrites*
a `index.html` perquè les rutes del client i el `/callback` de Spotify funcionin amb
enllaços directes i QR. Recorda configurar les variables d'entorn al projecte de Vercel.
