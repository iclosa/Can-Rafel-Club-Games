import '../hitster.css'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useGameSync } from '../hooks/useGameSync'
import { StealTakenError, submitBonus, submitGuess, submitSteal } from '../services/gameService'
import { playCorrect, playWrong } from '../lib/sfx'
import Timeline from '../components/Timeline'

export default function PlayerView() {
  const { code } = useParams<{ code: string }>()
  const { game, players, teams, teamCards, currentCard, latestGuess, currentSteal, loading } =
    useGameSync(code ?? null)

  const myId = code ? localStorage.getItem(`hitster:playerId:${code}`) : null
  const me = players.find((p) => p.id === myId)
  const myTeam = teams.find((t) => t.id === me?.team_id)
  const activeTeam = teams.find((t) => t.turn_order === game?.current_team_index)
  const isMyTurn = Boolean(myTeam && activeTeam && myTeam.id === activeTeam.id)
  const myTimeline = teamCards.filter((tc) => tc.team_id === myTeam?.id)
  const activeTimeline = teamCards.filter((tc) => tc.team_id === activeTeam?.id)
  const phase = game?.turn_phase
  const status = game?.status

  const [usedJoker, setUsedJoker] = useState(false)
  const [showYear, setShowYear] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [bonusArtist, setBonusArtist] = useState('')
  const [bonusTitle, setBonusTitle] = useState('')
  const [bonusBusy, setBonusBusy] = useState(false)

  const [stealing, setStealing] = useState(false)
  const [stealError, setStealError] = useState<string | null>(null)

  const place = async (position: number) => {
    if (!game || !myTeam || !currentCard || !me || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await submitGuess({
        gameId: game.id,
        teamId: myTeam.id,
        cardId: currentCard.id,
        position,
        usedJoker,
        playerId: me.id,
      })
      setUsedJoker(false)
      setShowYear(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const useJoker = () => {
    setUsedJoker(true)
    setShowYear(true)
  }

  const doSteal = async (position: number) => {
    if (!game || !myTeam || !currentCard || !me) return
    setStealError(null)
    try {
      await submitSteal({
        gameId: game.id,
        cardId: currentCard.id,
        teamId: myTeam.id,
        position,
        playerId: me.id,
      })
      setStealing(false)
    } catch (e) {
      setStealing(false)
      setStealError(
        e instanceof StealTakenError ? 'Un altre equip s\'hi ha avançat.' : 'No s\'ha pogut robar.'
      )
    }
  }

  const sendBonus = async (skip: boolean) => {
    if (!latestGuess || bonusBusy) return
    setBonusBusy(true)
    try {
      await submitBonus(latestGuess.id, skip ? '' : bonusArtist.trim(), skip ? '' : bonusTitle.trim())
      setBonusArtist('')
      setBonusTitle('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBonusBusy(false)
    }
  }

  // So del resultat quan es revela
  const sfxRef = useRef<string | null>(null)
  useEffect(() => {
    if (phase !== 'revealing' || !latestGuess || latestGuess.correct === null) return
    if (sfxRef.current === latestGuess.id) return
    sfxRef.current = latestGuess.id
    if (latestGuess.correct) playCorrect()
    else playWrong()
  }, [phase, latestGuess])

  const winnerTeam = teams.find((t) => t.id === game?.winner_team_id)
  const myGuessPending =
    latestGuess?.team_id === myTeam?.id &&
    latestGuess?.song_id === currentCard?.id &&
    latestGuess?.correct === null

  const correctYear = latestGuess?.correct === true
  const bonusSubmitted = latestGuess?.bonus_artist != null
  const bonusDecided = latestGuess?.bonus_correct != null
  // El títol real només es revela quan l'any és incorrecte o quan el bonus
  // ja s'ha decidit (per no donar pistes abans d'enviar el bonus).
  const titleRevealed = latestGuess?.correct === false || bonusDecided

  const iStole = currentSteal != null && currentSteal.team_id === myTeam?.id
  const someoneStole = currentSteal != null
  const stealerName = teams.find((t) => t.id === currentSteal?.team_id)?.name

  return (
    <div className="screen">
      <h1>{me?.nickname ?? 'Equip'}</h1>
      <p className="subtitle">
        {loading
          ? 'Connectant…'
          : !game
            ? 'Sala no trobada'
            : status === 'waiting'
              ? 'A la sala'
              : isMyTurn && status === 'playing'
                ? 'És el vostre torn!'
                : 'En joc'}
      </p>

      {status === 'waiting' && (
        <div className="card">
          <p>Esperant que l'amfitrió comenci la partida…</p>
        </div>
      )}

      {status === 'finished' && (
        <div className="card winner">
          <p className="winner-label">🏆 Guanya</p>
          <p className="winner-name">{winnerTeam?.name ?? '—'}</p>
          {winnerTeam?.id === myTeam?.id && <p>Felicitats! 🎉</p>}
        </div>
      )}

      {status === 'playing' && (
        <>
          {/* Reveal del resultat */}
          {phase === 'revealing' && currentCard && (
            <div className={`card reveal ${correctYear ? 'reveal--ok' : 'reveal--ko'}`}>
              <p className="reveal-verdict">{correctYear ? '✅ Any correcte!' : '❌ Any incorrecte'}</p>
              <p className="reveal-year">{currentCard.year}</p>
              {titleRevealed && (
                <p className="muted">
                  {currentCard.song_title} — {currentCard.artist}
                </p>
              )}

              {/* Bonus de l'equip actiu si ha encertat l'any */}
              {isMyTurn && correctYear && !bonusSubmitted && (
                <div className="bonus">
                  <p className="bonus-title">🎁 Bonus: artista i cançó per guanyar una 💿 fitxa</p>
                  <input
                    placeholder="Artista"
                    value={bonusArtist}
                    onChange={(e) => setBonusArtist(e.target.value)}
                    maxLength={60}
                  />
                  <input
                    placeholder="Cançó"
                    value={bonusTitle}
                    onChange={(e) => setBonusTitle(e.target.value)}
                    maxLength={60}
                  />
                  <button
                    className="primary"
                    onClick={() => sendBonus(false)}
                    disabled={bonusBusy || (!bonusArtist.trim() && !bonusTitle.trim())}
                  >
                    Envia el bonus
                  </button>
                  <button onClick={() => sendBonus(true)} disabled={bonusBusy}>
                    No ho sabem
                  </button>
                </div>
              )}
              {isMyTurn && correctYear && bonusSubmitted && !bonusDecided && (
                <p className="muted">Esperant que l'amfitrió validi el bonus…</p>
              )}
              {isMyTurn && correctYear && bonusDecided && (
                <p className="bonus-result">
                  {latestGuess?.bonus_correct
                    ? 'Heu guanyat una 💿 fitxa!'
                    : 'Sense fitxa aquesta vegada.'}
                </p>
              )}
              {!isMyTurn && correctYear && !bonusDecided && !iStole && (
                <p className="muted">{activeTeam?.name} prova el bonus…</p>
              )}

              {/* Resultat del nostre robatori */}
              {iStole && (
                <p className="bonus-result">
                  {correctYear
                    ? `${activeTeam?.name} ha encertat — sense robatori.`
                    : currentSteal?.won == null
                      ? '🥷 Esperant el resultat del robatori…'
                      : currentSteal.won
                        ? '🥷 Heu robat la carta!'
                        : 'Robatori fallat.'}
                </p>
              )}
            </div>
          )}

          {/* El nostre torn: col·locar la carta */}
          {isMyTurn && phase === 'song_playing' && !myGuessPending && (
            <div className="card">
              <h2>És el vostre torn</h2>
              <p className="muted">
                Escolteu la cançó i col·loqueu-la a la vostra línia temporal segons l'any.
              </p>

              {showYear && currentCard && (
                <p className="joker-hint">Pista: any {currentCard.year}</p>
              )}

              <Timeline cards={myTimeline} onPlace={place} disabled={submitting} />

              {myTeam && myTeam.jokers > 0 && !usedJoker && (
                <button onClick={useJoker} disabled={submitting}>
                  💿 Feu servir una fitxa — veure l'any ({myTeam.jokers} restants)
                </button>
              )}
              {error && <p className="join-error">{error}</p>}
            </div>
          )}

          {/* El nostre torn però ja hem enviat la posició */}
          {isMyTurn && myGuessPending && (
            <div className="card">
              <p>Heu enviat la resposta. Esperant l'amfitrió…</p>
            </div>
          )}

          {/* Torn d'un altre equip — opció de robar */}
          {!isMyTurn && phase !== 'revealing' && (
            <div className="card">
              <p className="phase-big">🎵 Torn de {activeTeam?.name}</p>

              {iStole ? (
                <p className="muted">🥷 Heu intentat robar! Esperant el resultat…</p>
              ) : someoneStole ? (
                <p className="muted">🥷 {stealerName} ja ha robat aquesta carta.</p>
              ) : stealing ? (
                <>
                  <p className="muted">
                    On va la cançó a la línia de {activeTeam?.name}? (a cegues)
                  </p>
                  <Timeline cards={activeTimeline} onPlace={doSteal} />
                  <button onClick={() => setStealing(false)}>Cancel·la</button>
                </>
              ) : myTeam && myTeam.jokers > 0 ? (
                <button onClick={() => setStealing(true)}>
                  🥷 Roba la carta (gasta una 💿 fitxa, en queden {myTeam.jokers})
                </button>
              ) : (
                <p className="muted">Escolteu… el vostre torn arribarà aviat.</p>
              )}
              {stealError && <p className="join-error">{stealError}</p>}
            </div>
          )}

          {/* La nostra línia temporal (referència) */}
          <div className="card">
            <h2>La vostra línia temporal</h2>
            <Timeline cards={myTimeline} />
          </div>
        </>
      )}
    </div>
  )
}
