# HITSTER — Especificació tècnica

Joc multijugador estil Kahoot inspirat en Hitster. Els jugadors entren amb QR + nickname i col·loquen cançons a la seva línia temporal personal per any.

> **Actualització v1.1 — sense equips.** Cada jugador és el seu propi "equip" (una línia temporal individual). En començar, es crea automàticament un equip per jugador (no es demana el nombre d'equips). El model de dades manté la taula `teams` per simplicitat: hi ha exactament un `team` per jugador, amb `name` = el seu nickname. El nombre de jugadors es pot limitar amb `VITE_MAX_PLAYERS` al `.env` (buit = sense límit).

---

## 1. Arquitectura general

```
┌──────────────────────┐         ┌──────────────────────┐
│  HOST (TV/portàtil)  │         │  Players (mòbils)    │
│  /                   │         │  /join/:code         │
│  /host/:code         │         │  /play/:code         │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           │      Supabase Realtime         │
           │  ─────────────────────────────►│
           │                                │
           └──────────────┬─────────────────┘
                          ▼
           ┌──────────────────────────────┐
           │  Supabase                    │
           │  • Postgres (font de veritat)│
           │  • Realtime (canvis + presence)
           │  • Storage opcional (àudio)  │
           └──────────────────────────────┘
```

**Decisions clau:**

1. **Postgres com a font de veritat** — totes les entitats (games, players, teams, cards, team_cards) viuen a la BBDD. Cada client se subscriu via `postgres_changes` i refesca el seu estat local.
2. **Host com a autoritat** — el client que té la sala oberta a `/` (el TV/projector) és qui escriu els canvis crítics (assignar equips, validar jugades, avançar el torn). Els jugadors mòbils només escriuen el seu propi nickname i emeten "intencions" (la seva resposta).
3. **Anon key + RLS permissives** — cap autenticació; qualsevol amb el codi de sala pot llegir/escriure. Per a una v1 entre amics és suficient. Si calgués prevenir trampes, es migra la validació a una Edge Function.
4. **Catàleg de cançons** com a taula `cards` global (no per partida). En crear partida es genera un mall amb un subconjunt aleatori de N cartes.

---

## 2. Màquina d'estats de la partida

```
              ┌───────────┐
              │  waiting  │  ← jugadors entrant, sense equips
              └─────┬─────┘
                    │ host clica "Comença"
                    ▼
              ┌───────────┐
              │  playing  │
              └─────┬─────┘
                    │
        ┌───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼
  turn_starting → song → guessing → revealing → next_turn ↻
                                                    │
                                              equip arriba a 10
                                                    ▼
                                              ┌──────────┐
                                              │ finished │
                                              └──────────┘
```

**Subestats dins `playing`** (camp `turn_phase` a la taula `games`):

| Fase             | Què passa                                                |
|------------------|----------------------------------------------------------|
| `turn_starting`  | S'escolleix la pròxima carta del catàleg, no es mostra encara |
| `song_playing`   | Sona la cançó al host (audio.play()). Equip pot demanar comodí |
| `guessing`       | L'equip actiu envia la seva posició                      |
| `revealing`      | El host valida i mostra resultat (encert/errada + any)   |
| `next_turn`      | Pausa breu i passa al següent equip                      |

---

## 3. Model de dades (Postgres)

### 3.1 Taules

```sql
-- Catàleg global de cançons
cards (
  id uuid pk,
  song_title text,
  artist text,
  year int,
  audio_url text,        -- URL pública (Spotify preview, Deezer, mp3 propi…)
  created_at timestamptz
)

-- Una partida
games (
  id uuid pk,
  code text unique,                                  -- "AB3X7", el del QR
  status text check (status in ('waiting','playing','finished')),
  turn_phase text,                                   -- vegeu §2
  number_of_teams int,
  current_team_index int,                            -- 0..N-1
  current_card_id uuid references cards(id),
  winning_cards int default 10,
  winner_team_id uuid references teams(id),
  host_player_id uuid,                               -- qui té la pantalla principal
  created_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz
)

-- Jugador inscrit a una partida
players (
  id uuid pk,
  game_id uuid references games(id) on delete cascade,
  nickname text,
  team_id uuid references teams(id),                 -- null fins que s'assigna
  is_host boolean default false,
  joined_at timestamptz,
  UNIQUE (game_id, nickname)                         -- nickname únic per partida
)

-- Equip dins d'una partida
teams (
  id uuid pk,
  game_id uuid references games(id) on delete cascade,
  name text,                                         -- "Equip 1", "Equip 2"…
  jokers int default 3,
  turn_order int                                     -- 0..N-1
)

-- Cartes col·locades a la línia temporal d'un equip
team_cards (
  id uuid pk,
  team_id uuid references teams(id) on delete cascade,
  card_id uuid references cards(id),
  position int,                                      -- 0..n; ordre a la timeline
  is_initial boolean default false,                  -- la carta de sortida
  placed_at timestamptz
)

-- Intent de jugada (la fa el jugador des del mòbil; el host la valida)
guesses (
  id uuid pk,
  team_id uuid references teams(id),
  card_id uuid references cards(id),
  position int,                                      -- posició proposada
  correct boolean,                                   -- null fins que el host valida
  used_joker boolean default false,
  submitted_by uuid references players(id),
  created_at timestamptz
)
```

### 3.2 Restriccions clau

- `UNIQUE (game_id, nickname)` → l'error 23505 al `INSERT` és el que dispara "nickname ja en ús".
- `current_team_index` i `current_card_id` són els únics camps que canvien per cada torn → poca contesa d'escriptura.
- Les cartes pertanyen al catàleg global; `team_cards` només referencia. Així una mateixa cançó pot sortir en diferents partides.

### 3.3 RLS (mínim viable)

Política permissiva per a v1: qualsevol pot llegir/escriure qualsevol fila amb un `game_id` que existeixi. Per a una versió més estricta:

- `SELECT`: tothom pot llegir si la partida està a `status != 'finished'` o si és pública.
- `INSERT players`: només si la partida està a `status = 'waiting'`.
- `UPDATE games / teams / team_cards`: només si `player.is_host = true` (validar via funció).

---

## 4. Catàleg de cançons

**Per a v1** prepara un JSON local `src/data/songs.json` amb 50-100 cançons (any, títol, artista, URL del fragment de 30s). Pots treure les URLs de:

- iTunes Search API (`https://itunes.apple.com/search?term=...`) — té `previewUrl` de 30s sense auth.
- Deezer API — també sense auth per a previews.
- Spotify Web API — requereix client credentials.

En crear la partida, executes `INSERT INTO cards (...) SELECT ... FROM songs_seed` o pre-poblar la taula `cards` un cop i reutilitzar.

**Selecció de cartes per partida:** quan comença el joc, el host fa:

```sql
SELECT * FROM cards ORDER BY random() LIMIT 60;
```

i les desa en memòria o en una taula `game_cards` (game_id, card_id, drawn_order). El primer N cartes són les "inicials" (una per equip), la resta es treuen una per torn.

---

## 5. Flux complet

### 5.1 Sala d'espera

1. Host obre `/` → genera codi (`generateRoomCode`).
2. Host insereix una fila a `games` amb `status='waiting'`.
3. Host es crea com a `players` amb `is_host=true`.
4. UI mostra QR amb `http://<origin>/join/<code>`.
5. Jugador escaneja → `/join/<code>` → introdueix nickname → es fa `INSERT INTO players`.
   - Si retorna error 23505 → mostra missatge "Aquest nom ja s'està utilitzant".
   - Si OK → redirigeix a `/play/<code>`.
6. Tots els clients veuen els nous jugadors via `postgres_changes` a `players`.

### 5.2 Inici de partida

1. Host clica "Comença la partida" (no es demana res més; cal un mínim de 2 jugadors).
2. Host crida la funció PL/pgSQL `start_game(p_game_id)` (transacció atòmica, `SECURITY DEFINER`):
   - Crea **un `team` per jugador** no-host (turn_order 0..N-1, `name` = nickname), en ordre aleatori.
   - Assigna cada `player.team_id` al seu equip.
   - A cada equip li dona una carta inicial de `cards` (random) a `team_cards` amb `is_initial=true`, `position=0`.
   - Selecciona una carta nova com a `current_card_id`.
   - Posa `games.status='playing'`, `turn_phase='song_playing'`, `current_team_index=0`, `number_of_teams=N`.

### 5.3 Torn

1. Tots els clients reben canvi de `games` → reaccionen.
2. Host carrega l'àudio de `current_card_id.audio_url` i el reprodueix.
3. Mòbils de l'equip actiu veuen la seva timeline amb "espais" entre cartes i un botó per cada posició possible (o un slider/drag).
4. Un jugador de l'equip envia la seva resposta:
   - `INSERT INTO guesses (team_id, card_id, position, used_joker, submitted_by)`.
5. Host detecta el `guesses` nou → valida (§7) → escriu el resultat:
   - Actualitza `guesses.correct`.
   - Si encert: `INSERT INTO team_cards (...)` amb la posició correcta; reordena la timeline.
   - `UPDATE games SET turn_phase='revealing'`.
6. Després de X segons (3-5), host avança:
   - Comprova si l'equip ha arribat a `winning_cards` → `status='finished'`, `winner_team_id=...`.
   - Si no, `current_team_index = (current+1) % N`, tria nova `current_card_id`, `turn_phase='song_playing'`.

### 5.4 Final

1. Quan `games.status='finished'`, tots els clients mostren la pantalla de guanyador.
2. Host pot tornar a `/` i començar nova partida (codi nou).

---

## 6. Equips (v1.1: un per jugador)

Ja no hi ha repartiment: **cada jugador és el seu propi equip**. `start_game` crea un `team` per jugador (en ordre de torn aleatori) i assigna `player.team_id`. L'ordre de torn es decideix amb un `ORDER BY random()` a la funció.

> Històric (v1.0): es repartien els jugadors en N equips amb Fisher-Yates + round-robin. Descartat en favor d'un equip per jugador.

---

## 7. Validació de jugada

Donat:

- `timeline` = array de `team_cards` ordenades per `position`, cada una amb el seu `card.year`.
- `currentCard.year` = any de la cançó sonant.
- `guessedPosition` = índex on l'equip proposa col·locar la carta (0 = abans de tot, n = després de tot).

```ts
function validateGuess(
  timelineYears: number[],
  currentYear: number,
  guessedPosition: number
): boolean {
  const before = timelineYears[guessedPosition - 1] ?? -Infinity
  const after  = timelineYears[guessedPosition]     ?? +Infinity
  return currentYear >= before && currentYear <= after
}
```

Si dues cartes a la timeline tenen el mateix any, qualsevol posició entre elles compta com a vàlida (els comparadors són `>=` / `<=`).

**Posició real** quan és correcte: insertar a `guessedPosition` i reindexar `position` de la resta.

---

## 8. Fitxes (v1.1, abans "comodins")

El recurs es diu **fitxa** (icona 💿, `teams.jokers` a la BBDD). Es **gasta** per veure una pista i es **guanya** amb el bonus.

**Gastar una fitxa (pista de l'any):**
- En col·locar, el jugador pot gastar una fitxa: `guesses.used_joker = true`.
- `resolve_guess` decrementa `teams.jokers`.
- El client mostra **l'any exacte** de la cançó abans d'enviar la posició.

**Guanyar una fitxa (bonus artista + cançó):**
- Si l'equip **encerta l'any**, pot escriure artista + cançó (`submit_bonus` → `guesses.bonus_artist` / `bonus_title`).
- **Anti-trampa:** el títol/artista real NO es revela (ni al projector ni al mòbil) i la cançó **segueix sonant** fins que l'equip ha enviat el bonus (`titleRevealed`).
- L'amfitrió valida (`award_bonus`): si és correcte, `teams.jokers += 1`. Idempotent.

**Robatori (gastar fitxa per robar la carta):**
- Durant la cançó del torn, un equip **no-actiu** pot gastar una fitxa per indicar on va la carta a la línia de l'equip **rival** (l'actiu), **a cegues** (sense veure l'any). `submit_steal` → taula `steals`, `unique(game_id, card_id)` = només el **primer** que respon; la fitxa **sempre** es gasta.
- Si l'equip actiu **falla l'any**, l'amfitrió valida el robatori contra la línia del **rival** (`award_steal`): si encerta, la carta s'afegeix a la línia del **lladre** a la seva posició cronològica. Si l'actiu encerta, el robatori no té efecte (però la fitxa ja s'ha gastat).

Idees futures: "veure la primera lletra de l'artista", "ampliar marge: encert si t'equivoques per ±2 anys".

---

## 9. Estructura del frontend

```
src/
  pages/
    Home.tsx              # Lobby del host (QR, llista, "Comença")
    Join.tsx              # Mòbil: nickname + entrar
    Lobby.tsx             # Mòbil: esperant que comenci
    Game.tsx              # Wrapper: decideix HostView o PlayerView segons rol
  components/
    lobby/
      QrCard.tsx
      PlayersList.tsx
      StartGameModal.tsx        # Tria nombre d'equips
      NicknameForm.tsx
    game/
      HostView.tsx              # Pantalla gran: àudio + estat
      PlayerView.tsx            # Mòbil: timeline + accions
      Timeline.tsx              # Render de les cartes
      TimelineSlots.tsx         # Buits entre cartes per col·locar
      JokerPanel.tsx            # 3 botons (queden els no usats)
      TurnIndicator.tsx
      ScoreBoard.tsx
      ResultModal.tsx           # Encert/errada
      WinnerScreen.tsx
  hooks/
    useGame.ts                  # Subscripció a games + state
    usePlayers.ts               # Subscripció a players
    useTeams.ts                 # Subscripció a teams + team_cards
    useNickname.ts              # Validació uniqueness
    useAudioPlayer.ts           # Control del <audio>
  services/
    gameService.ts              # createGame, startGame, advanceTurn, submitGuess…
    cardCatalog.ts              # selectRandomCards
    teamDistribution.ts         # distributeTeams
  lib/
    supabase.ts
    gameRules.ts                # validateGuess (pura)
    roomCode.ts
  types/
    db.ts                       # supabase gen types
    game.ts                     # Player, Team, Card, Game (domain)
  data/
    songs.json                  # catàleg seed
```

### Responsabilitats per servei

- **`gameService.ts`** — totes les escriptures crítiques. Si més endavant es mou a Edge Functions, el contracte es manté.
- **`gameRules.ts`** — funcions pures, sense Supabase. Reutilitzables al backend si es migra.
- **`useGame`** — subscriu el component a `games` (single row by code). Exposa `{ game, loading, error }`.

### Decisió: "qui és el host"?

A l'iniciar `/`, es crea el player amb `is_host=true` i el seu id es guarda a `localStorage[`hitster:hostId:${code}`]`. Si el host refresca, recupera la sessió. Si el host tanca la pestanya, el següent que torna a obrir `/` amb el mateix codi pot "reclamar" el rol (out of scope per a v1).

---

## 10. Proves en local

### 10.1 Exposar el dev server a la LAN

A `package.json`:

```json
"scripts": {
  "dev": "vite --host"
}
```

Equival a `vite --host 0.0.0.0`. Quan executes `npm run dev` Vite mostrarà:

```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.42:5173/    ← aquesta!
```

### 10.2 IP local de l'ordinador

```bash
# macOS / Linux
ipconfig getifaddr en0    # macOS WiFi
# o:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr IPv4
```

### 10.3 El QR ha d'apuntar a la LAN, no a localhost

El codi actual fa `window.location.origin`. Si el host obre el navegador a `http://192.168.1.42:5173` (en lloc de localhost), el QR codifica `http://192.168.1.42:5173/join/<code>` i els mòbils hi arribaran.

**Regla:** sempre que vulguis provar amb mòbils, obre tu mateix el `/` amb la IP, no amb `localhost`.

### 10.4 Diversos jugadors al mateix ordinador

Funciona perquè cada finestra té el seu propi `localStorage` i `crypto.randomUUID()`. Combinacions útils:

- Pestanya normal de Chrome → host.
- Finestra d'incògnit de Chrome → jugador 1.
- Firefox → jugador 2.
- Safari → jugador 3.

Cada una entra a `http://192.168.1.42:5173/join/<code>` amb un nickname diferent.

### 10.5 Mòbil

- Connecta el mòbil a la **mateixa xarxa WiFi** que l'ordinador.
- Escaneja el QR del host (que ja apunta a la IP local).
- Si Safari iOS bloqueja l'autoplay del `<audio>`, recorda que el primer `play()` ha de ser dins d'un gest d'usuari (clic).

### 10.6 HTTPS no és necessari per a aquest joc

`getUserMedia` i altres APIs sí que requereixen HTTPS, però com que aquí només reproduïm àudio amb `<audio src>` i fem fetch a Supabase (que ja és HTTPS), HTTP local és OK.

---

## 11. Pla d'implementació per fases

### Fase 1 — Cimentació BBDD i nickname únic
- [ ] Crear projecte a Supabase, executar `supabase/schema.sql`.
- [ ] Migrar el codi actual perquè `Home` insereixi `games` i `players` (en lloc de presence pur).
- [ ] `useNickname` amb gestió d'error 23505.
- [ ] Llista de jugadors al lobby llegint de `players` via `postgres_changes`.

### Fase 2 — Equips i carta inicial
- [ ] Modal "Quants equips?" amb 2-6.
- [ ] Funció `startGame` que crea teams, reparteix players, assigna cartes inicials.
- [ ] Pantalla d'inici amb el reveal dels equips (animació).

### Fase 3 — Mecànica de torn
- [ ] Component `HostView` amb `<audio>` controlat.
- [ ] Component `PlayerView` amb `Timeline` + `TimelineSlots`.
- [ ] `gameRules.validateGuess` (test unitari).
- [ ] Bucle complet: tria carta → so → guess → validació → avançar torn.

### Fase 4 — Comodins
- [ ] `JokerPanel` mostra 3 estrelles, gris quan gastades.
- [ ] Quan s'usa, la `PlayerView` mostra la dècada de la carta.

### Fase 5 — Final i polish
- [ ] Detectar 10 cartes → `WinnerScreen` amb animació.
- [ ] Sons d'encert/errada.
- [ ] Botó "Nova partida" al final.

---

## 12. Decisions pendents

- **Catàleg inicial**: arrenquem amb JSON manual de ~50 cançons o integrem iTunes/Deezer en runtime?
- **Música**: previews de 30s o cançons completes pujades a Supabase Storage?
- **Mòbil sense vibració/so**: cal feedback hàptic quan toca el seu torn?
- **Multi-host**: per ara només un. Si el host marxa, què passa? (v1: la partida queda penjada; v2: el següent pot reclamar el rol).
