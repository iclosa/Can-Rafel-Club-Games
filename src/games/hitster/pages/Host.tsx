import '../hitster.css'
import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGameSync } from '../hooks/useGameSync'
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer'
import { useSpotifyAuth } from '../hooks/useSpotifyAuth'
import { validateGuess } from '../lib/gameRules'
import { playCorrect, playWrong } from '../lib/sfx'
import { advanceTurn, awardBonus, awardSteal, resolveGuess } from '../services/gameService'
import TeamsReveal from '../components/TeamsReveal'
import Timeline from '../components/Timeline'
import SpotifyPanel from '../components/SpotifyPanel'

export default function Host() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { game, teams, teamCards, currentCard, latestGuess, currentSteal, loading } = useGameSync(
    code ?? null
  )
  const { authenticated } = useSpotifyAuth()
  const { ready, play, pause, resume, nowPlaying } = useSpotifyPlayer()

  const phase = game?.turn_phase
  const activeTeam = teams.find((t) => t.turn_order === game?.current_team_index)
  const activeTimeline = teamCards.filter((tc) => tc.team_id === activeTeam?.id)

  // ── Reprodueix la cançó en entrar a song_playing ──────────────────────────
  const playedRef = useRef<string | null>(null)
  useEffect(() => {
    if (phase !== 'song_playing' || !currentCard?.audio_url || !ready) return
    if (playedRef.current === currentCard.id) return
    playedRef.current = currentCard.id
    play(currentCard.audio_url).catch((e) => console.error('[host] play', e))
  }, [phase, currentCard?.id, currentCard?.audio_url, ready, play])

  // ── Resol la resposta quan arriba (autoritat del host) ────────────────────
  const resolvedRef = useRef<string | null>(null)
  useEffect(() => {
    if (phase !== 'guessing' || !latestGuess || latestGuess.correct !== null || !currentCard) return
    if (!activeTeam || latestGuess.team_id !== activeTeam.id) return
    if (resolvedRef.current === latestGuess.id) return
    resolvedRef.current = latestGuess.id
    const years = activeTimeline
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((tc) => tc.card?.year ?? 0)
    const ok = validateGuess(years, currentCard.year, latestGuess.position)
    resolveGuess(latestGuess.id, ok).catch((e) => console.error('[host] resolve', e))
  }, [phase, latestGuess, currentCard, activeTeam, activeTimeline])

  // ── So del resultat + atura la música en revelar ──────────────────────────
  // La cançó segueix sonant si l'any és correcte i encara no s'ha enviat el
  // bonus; s'atura quan l'any falla o quan l'equip ja ha enviat artista+cançó.
  const sfxRef = useRef<string | null>(null)
  useEffect(() => {
    if (phase !== 'revealing') return
    if (latestGuess && latestGuess.correct !== null && sfxRef.current !== latestGuess.id) {
      sfxRef.current = latestGuess.id
      if (latestGuess.correct) playCorrect()
      else playWrong()
    }
    const shouldPause = latestGuess?.correct === false || latestGuess?.bonus_artist != null
    if (shouldPause) pause().catch(() => {})
  }, [phase, pause, latestGuess])

  // ── Resol el robatori si l'equip actiu ha fallat ──────────────────────────
  const stealRef = useRef<string | null>(null)
  useEffect(() => {
    if (phase !== 'revealing' || !currentSteal || currentSteal.won !== null || !currentCard) return
    if (latestGuess?.correct !== false) return // només si l'actiu ha fallat
    if (stealRef.current === currentSteal.id) return
    stealRef.current = currentSteal.id
    // El robatori es valida sobre la línia de l'equip actiu (rival).
    const years = teamCards
      .filter((tc) => tc.team_id === activeTeam?.id)
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((tc) => tc.card?.year ?? 0)
    const ok = validateGuess(years, currentCard.year, currentSteal.position)
    awardSteal(currentSteal.id, ok).catch((e) => console.error('[host] steal', e))
  }, [phase, currentSteal, latestGuess, currentCard, teamCards, activeTeam])

  const nextTurn = () => {
    if (game) advanceTurn(game.id).catch((e) => console.error('[host] advance', e))
  }
  const togglePlay = () => {
    void (nowPlaying?.paused ? resume() : pause())
  }
  const judgeBonus = (ok: boolean) => {
    if (latestGuess) awardBonus(latestGuess.id, ok).catch((e) => console.error('[host] bonus', e))
  }

  const playing = game?.status === 'playing'
  const finished = game?.status === 'finished'
  const winnerTeam = teams.find((t) => t.id === game?.winner_team_id)
  const revealed = phase === 'revealing'
  const correctYear = latestGuess?.correct === true
  const bonusSubmitted = latestGuess?.bonus_artist != null
  const bonusDecided = latestGuess?.bonus_correct != null
  const titleRevealed = latestGuess?.correct === false || bonusSubmitted
  const stealerTeam = teams.find((t) => t.id === currentSteal?.team_id)

  return (
    <div className="screen screen--wide">
      <h1>Sala {code}</h1>
      <p className="subtitle">
        {loading
          ? 'Carregant…'
          : !game
            ? 'Sala no trobada'
            : finished
              ? 'Partida acabada'
              : playing
                ? `Torn de ${activeTeam?.name ?? '—'}`
                : 'Esperant inici…'}
      </p>

      {finished && (
        <div className="card winner">
          <div className="winner-trophy">🏆</div>
          <p className="winner-label">Guanya</p>
          <p className="winner-name">{winnerTeam?.name ?? '—'}</p>
          <button className="primary" onClick={() => navigate('/hitster')}>
            Nova partida
          </button>
        </div>
      )}

      {playing && (
        <>
          <div className="card turn-card">
            {phase === 'song_playing' && (
              <>
                {currentCard && !currentCard.audio_url && (
                  <p className="muted">
                    Aquesta carta no té àudio. Sincronitza el catàleg amb Spotify.
                  </p>
                )}
                {!ready && authenticated && <p className="muted">Preparant reproductor…</p>}
                {!authenticated && <p className="muted">Connecta Spotify per reproduir.</p>}
                {ready && currentCard?.audio_url && (
                  <button className="primary" onClick={togglePlay}>
                    {nowPlaying?.paused ? '▶️ Continua' : '⏸ Pausa'}
                  </button>
                )}
              </>
            )}
            {phase === 'guessing' && <p className="phase-big">⏳ Validant resposta…</p>}
            {revealed && currentCard && (
              <div className={`reveal ${correctYear ? 'reveal--ok' : 'reveal--ko'}`}>
                <p className="reveal-verdict">
                  {correctYear ? '✅ Any correcte!' : '❌ Any incorrecte'}
                </p>
                <p className="reveal-year">{currentCard.year}</p>

                {/* El títol només es revela quan l'any falla o quan l'equip ja
                    ha enviat el bonus (per no donar pistes). */}
                {titleRevealed ? (
                  <p className="muted">
                    {currentCard.song_title} — {currentCard.artist}
                  </p>
                ) : (
                  <p className="muted">🎁 {activeTeam?.name} està escrivint el bonus…</p>
                )}

                {/* Validació del bonus */}
                {correctYear && bonusSubmitted && !bonusDecided && (
                  <div className="bonus">
                    <p className="bonus-title">Bonus de {activeTeam?.name}:</p>
                    <p className="bonus-guess">
                      «{latestGuess?.bonus_title || '—'} — {latestGuess?.bonus_artist || '—'}»
                    </p>
                    <div className="row">
                      <button className="primary" onClick={() => judgeBonus(true)}>
                        Dona 💿 fitxa
                      </button>
                      <button onClick={() => judgeBonus(false)}>No és correcte</button>
                    </div>
                  </div>
                )}
                {correctYear && bonusDecided && (
                  <p className="bonus-result">
                    {latestGuess?.bonus_correct
                      ? `💿 ${activeTeam?.name} guanya una fitxa!`
                      : 'Bonus fallat.'}
                  </p>
                )}

                {currentSteal && (
                  <p className="bonus-result">
                    🥷 {stealerTeam?.name}{' '}
                    {correctYear
                      ? '(sense efecte: l’actiu ha encertat)'
                      : currentSteal.won == null
                        ? 'intenta robar…'
                        : currentSteal.won
                          ? 'roba la carta!'
                          : 'falla el robatori'}
                  </p>
                )}

                <button className="primary" onClick={nextTurn}>
                  Següent torn ▶
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <h2>Línia temporal · {activeTeam?.name}</h2>
            <Timeline cards={activeTimeline} />
          </div>

          <div className="card">
            <h2>Marcador</h2>
            <TeamsReveal
              teams={teams}
              teamCards={teamCards}
              highlightTeamId={activeTeam?.id}
              winningCards={game?.winning_cards}
            />
          </div>
        </>
      )}

      {!finished && <SpotifyPanel />}
    </div>
  )
}
