import '../trivial.css'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTrivialSync } from '../useTrivialSync'
import {
  bombaExplode,
  bombaRearm,
  emojiNext,
  horseContinue,
  nextTrivial,
  penalsAdvance,
  revealTrivial,
} from '../trivialService'
import type { TrivialTeam } from '../types'
import PenalsView from '../PenalsView'
import BombaView from '../BombaView'
import EmojiView from '../EmojiView'

const COLORS = ['opt-red', 'opt-blue', 'opt-gold', 'opt-green']
const SHAPES = ['▲', '◆', '●', '■']
const QUESTION_SECONDS = 60
const HORSE_SECONDS = 15
const HORSE_FINISH = 5

export default function TrivialHost() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { game, teams, answers, question, correctIndex, progress, loading } = useTrivialSync(
    code ?? null
  )

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  const phase = game?.phase
  const isHorseQ = phase === 'mg_horse'
  const isQuestion = phase === 'question'
  const limit = isHorseQ ? HORSE_SECONDS : QUESTION_SECONDS
  const startedMs = game?.question_started_at ? new Date(game.question_started_at).getTime() : null
  const remaining =
    (isQuestion || isHorseQ) && startedMs
      ? Math.max(0, limit - Math.floor((now - startedMs) / 1000))
      : null

  // Auto-revela quan s'acaba el temps o quan tots els equips han respost.
  const revealedRef = useRef<number>(-1)
  useEffect(() => {
    if (!game || (!isQuestion && !isHorseQ)) return
    const allAnswered = teams.length > 0 && answers.length >= teams.length
    if ((remaining === 0 || allAnswered) && revealedRef.current !== game.current_round) {
      revealedRef.current = game.current_round
      revealTrivial(game.id).catch((e) => console.error('[trivial] reveal', e))
    }
  }, [game, isQuestion, isHorseQ, teams.length, answers.length, remaining])

  const next = () => game && nextTrivial(game.id).catch((e) => console.error(e))

  const isMinigame = phase?.startsWith('mg_')
  const isHorse = phase?.startsWith('mg_horse')
  const isPenals = phase?.startsWith('mg_penals')
  const isBomba = phase?.startsWith('mg_bomba')
  const isEmoji = phase?.startsWith('mg_emoji')
  const answered = answers.length

  const mgIntro = isHorse
    ? '🐎 Cursa de cavalls — respon ràpid: cada encert avança el teu cavall. Primer a la meta!'
    : isPenals
      ? '⚽ Penals — eliminatòria 1 contra 1: el xutador i el porter trien zona. Mateixa zona = aturada.'
      : isBomba
        ? '💣 La bomba — digues alguna cosa de la categoria i passa-la, abans que exploti a les teves mans!'
        : isEmoji
          ? '😀 Endevina amb emojis — el primer equip que encerta la resposta guanya punts.'
          : null
  const champName = (id: string | null | undefined) => teams.find((t) => t.id === id)?.name ?? '—'

  const penals = game?.mg_state?.game === 'penals' ? game.mg_state : null
  const bomba = game?.mg_state?.game === 'bomba' ? game.mg_state : null
  const emoji = game?.mg_state?.game === 'emoji' ? game.mg_state : null

  // La bomba: el host fa esclatar la bomba quan s'acaba la metxa (secreta).
  const boomRef = useRef(0)
  useEffect(() => {
    if (phase !== 'mg_bomba' || !bomba || bomba.exploded) return
    if (now >= bomba.explodeAt && boomRef.current !== bomba.explodeAt) {
      boomRef.current = bomba.explodeAt
      if (game) bombaExplode(game.id).catch((e) => console.error('[trivial] boom', e))
    }
  }, [phase, bomba, now, game])

  // Cursa: auto-avança a la pregunta següent ~1 s després de revelar.
  const horseRevealAt = useRef<{ round: number; t: number } | null>(null)
  const horseContedRef = useRef(-1)
  useEffect(() => {
    if (phase !== 'mg_horse_reveal' || !game) return
    if (!horseRevealAt.current || horseRevealAt.current.round !== game.current_round) {
      horseRevealAt.current = { round: game.current_round, t: now }
    }
    if (horseContedRef.current !== game.current_round && now - horseRevealAt.current.t >= 1000) {
      horseContedRef.current = game.current_round
      horseContinue(game.id).catch((e) => console.error('[trivial] horse next', e))
    }
  }, [phase, game, now])

  // Preguntes normals: auto-avança ~3 s després de revelar (sense botó manual).
  const qRevealAt = useRef<{ round: number; t: number } | null>(null)
  const qNextedRef = useRef(-1)
  useEffect(() => {
    if (phase !== 'reveal' || !game) return
    if (!qRevealAt.current || qRevealAt.current.round !== game.current_round) {
      qRevealAt.current = { round: game.current_round, t: now }
    }
    if (qNextedRef.current !== game.current_round && now - qRevealAt.current.t >= 3000) {
      qNextedRef.current = game.current_round
      nextTrivial(game.id).catch((e) => console.error('[trivial] next', e))
    }
  }, [phase, game, now])

  return (
    <div className="triv triv--host">
      <button className="triv-back" onClick={() => navigate('/')}>← Menú</button>

      <header className="triv-head triv-head--sm">
        <h1 className="triv-logo triv-logo--sm">TRIVIAL PARTY</h1>
        {game?.status === 'playing' && (
          <p className="triv-room">
            {isPenals
              ? '⚽ Minijoc · Penals'
              : isHorse
                ? '🐎 Minijoc · Cursa de cavalls'
                : isBomba
                  ? '💣 Minijoc · La bomba'
                  : isEmoji
                    ? '😀 Minijoc · Endevina amb emojis'
                    : `Ronda ${game.q_number}/${game.total_rounds}`}
          </p>
        )}
      </header>

      {mgIntro && !phase?.includes('_done') && !phase?.includes('_boom') && (
        <p className="triv-mg-intro">{mgIntro}</p>
      )}

      {loading && <p className="triv-muted">Carregant…</p>}

      {game?.status === 'finished' && (
        <div className="triv-final">
          <p className="triv-final-label">🏆 Guanya</p>
          <p className="triv-final-name">{teams[0]?.name ?? '—'}</p>
          <Scoreboard teams={teams} />
          <button className="triv-start" onClick={() => navigate('/trivial')}>Nova partida</button>
        </div>
      )}

      {/* MINIJOC: PENALS */}
      {game?.status === 'playing' && phase === 'mg_penals_done' && (
        <div className="triv-qcard triv-center">
          <h2 className="triv-question">⚽ Campió dels penals!</h2>
          <p><strong>{champName(penals?.champion ?? teams[0]?.id)}</strong> (+1500)</p>
          <button className="triv-start" onClick={next}>Continua la partida</button>
        </div>
      )}
      {game?.status === 'playing' && phase === 'mg_penals' && penals && (
        <PenalsView
          state={penals}
          teams={teams}
          mode="host"
          onAdvance={() => game && penalsAdvance(game.id).catch((e) => console.error(e))}
        />
      )}

      {/* MINIJOC: LA BOMBA */}
      {game?.status === 'playing' && phase === 'mg_bomba_done' && (
        <div className="triv-qcard triv-center">
          <h2 className="triv-question">💣 Sobreviu!</h2>
          <p>Guanya <strong>{champName(bomba?.champion ?? teams[0]?.id)}</strong> (+1500)</p>
          <button className="triv-start" onClick={next}>Continua la partida</button>
        </div>
      )}
      {game?.status === 'playing' && phase === 'mg_bomba_boom' && (
        <div className="triv-qcard triv-center">
          <h2 className="triv-question">💥 BOOM!</h2>
          <p>Eliminat: <strong>{champName(bomba?.loser ?? null)}</strong></p>
          <button className="triv-start" onClick={() => game && bombaRearm(game.id)}>Continua</button>
        </div>
      )}
      {game?.status === 'playing' && phase === 'mg_bomba' && bomba && (
        <BombaView state={bomba} teams={teams} mode="host" />
      )}

      {/* MINIJOC: ENDEVINA AMB EMOJIS */}
      {game?.status === 'playing' && isEmoji && (
        phase === 'mg_emoji_done' ? (
          <div className="triv-qcard triv-center">
            <h2 className="triv-question">😀 Emojis acabats!</h2>
            <button className="triv-start" onClick={next}>Continua la partida</button>
          </div>
        ) : (
          emoji && (
            <EmojiView
              state={emoji}
              teams={teams}
              mode="host"
              onNext={() => game && emojiNext(game.id)}
            />
          )
        )
      )}

      {/* MINIJOC: CURSA DE CAVALLS */}
      {game?.status === 'playing' && isHorse && (
        <>
          <HorseTrack teams={teams} progress={progress} />

          {phase === 'mg_horse_done' ? (
            <div className="triv-qcard triv-center">
              <h2 className="triv-question">🏁 A la meta!</h2>
              <p>
                Guanya la cursa:{' '}
                <strong>
                  {teams.filter((t) => (progress[t.id] ?? 0) >= HORSE_FINISH).map((t) => t.name).join(', ')}
                </strong>{' '}
                (+1500)
              </p>
              <button className="triv-start" onClick={next}>Continua la partida</button>
            </div>
          ) : (
            question && (
              <div className="triv-qcard">
                <div className="triv-qtop">
                  <span className="triv-cat">Pregunta ràpida · {question.category}</span>
                  {isHorseQ && <span className="triv-timer">{remaining}s</span>}
                </div>
                <h2 className="triv-question">{question.text}</h2>
                <div className="triv-opts">
                  {question.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`triv-opt triv-opt--wide ${COLORS[i]}${
                        phase === 'mg_horse_reveal' && correctIndex === i ? ' correct' : ''
                      }${phase === 'mg_horse_reveal' && correctIndex !== i ? ' dim' : ''}`}
                    >
                      <span className="triv-shape">{SHAPES[i]}</span> {opt}
                    </div>
                  ))}
                </div>
                <div className="triv-qfoot">
                  {isHorseQ ? (
                    <span className="triv-muted">{answered}/{teams.length} han respost…</span>
                  ) : (
                    <span className="triv-muted">Següent pregunta en uns segons…</span>
                  )}
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* PREGUNTES NORMALS */}
      {game?.status === 'playing' && !isMinigame && question && (
        <>
          <div className="triv-qcard">
            <div className="triv-qtop">
              <span className="triv-cat">{question.category} · pregunta {game?.round_q}/4</span>
              {isQuestion && <span className="triv-timer">{remaining}s</span>}
            </div>
            <h2 className="triv-question">{question.text}</h2>
            <div className="triv-opts">
              {question.options.map((opt, i) => (
                <div
                  key={i}
                  className={`triv-opt triv-opt--wide ${COLORS[i]}${
                    phase === 'reveal' && correctIndex === i ? ' correct' : ''
                  }${phase === 'reveal' && correctIndex !== i ? ' dim' : ''}`}
                >
                  <span className="triv-shape">{SHAPES[i]}</span> {opt}
                </div>
              ))}
            </div>
            {isQuestion && (
              <div className="triv-qfoot">
                <span className="triv-muted">{answered}/{teams.length} equips han respost…</span>
              </div>
            )}
            {phase === 'reveal' && (
              <div className="triv-qfoot">
                <span className="triv-muted">Següent en 3 s…</span>
              </div>
            )}
          </div>
          <Scoreboard teams={teams} />
        </>
      )}
    </div>
  )
}

function HorseTrack({
  teams,
  progress,
}: {
  teams: TrivialTeam[]
  progress: Record<string, number>
}) {
  return (
    <div className="horse-track">
      {teams.map((t) => {
        const pos = Math.min(HORSE_FINISH, progress[t.id] ?? 0)
        return (
          <div key={t.id} className="horse-lane">
            <span className="horse-name">{t.name}</span>
            <div className="horse-rail">
              <span className="horse" style={{ left: `${(pos / HORSE_FINISH) * 88}%` }}>🐎</span>
              <span className="horse-finish">🏁</span>
            </div>
            <span className="horse-pos">{pos}/{HORSE_FINISH}</span>
          </div>
        )
      })}
    </div>
  )
}

function Scoreboard({ teams }: { teams: TrivialTeam[] }) {
  return (
    <div className="triv-scoreboard">
      {teams.map((t, i) => (
        <div key={t.id} className={`triv-score-row${i === 0 ? ' leader' : ''}`}>
          <span className="triv-rank">{i + 1}</span>
          <span className="triv-tname">{t.name}</span>
          <span className="triv-pts">{t.score}</span>
        </div>
      ))}
    </div>
  )
}
