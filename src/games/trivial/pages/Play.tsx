import '../trivial.css'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTrivialSync } from '../useTrivialSync'
import { bombaPass, emojiAnswer, penalsChoose, submitTrivialAnswer } from '../trivialService'
import PenalsView from '../PenalsView'
import BombaView from '../BombaView'
import EmojiView from '../EmojiView'

const COLORS = ['opt-red', 'opt-blue', 'opt-gold', 'opt-green']
const SHAPES = ['▲', '◆', '●', '■']

export default function TrivialPlay() {
  const { code } = useParams<{ code: string }>()
  const { game, teams, question, correctIndex, answers, progress } = useTrivialSync(code ?? null)
  const teamId = code ? localStorage.getItem(`trivial:teamId:${code}`) : null
  const [sending, setSending] = useState(false)

  const myAnswer = answers.find((a) => a.team_id === teamId)
  const myTeam = teams.find((t) => t.id === teamId)
  const phase = game?.phase
  const answering = phase === 'question' || phase === 'mg_horse'
  const revealing = phase === 'reveal' || phase === 'mg_horse_reveal'
  const myHorse = teamId ? progress[teamId] ?? 0 : 0
  const penals = game?.mg_state?.game === 'penals' ? game.mg_state : null
  const bomba = game?.mg_state?.game === 'bomba' ? game.mg_state : null
  const emoji = game?.mg_state?.game === 'emoji' ? game.mg_state : null

  const answer = async (choice: number) => {
    if (!game || !teamId || sending || myAnswer) return
    setSending(true)
    try {
      await submitTrivialAnswer(game.id, teamId, null, choice)
    } catch (e) {
      console.error('[trivial] answer', e)
    } finally {
      setSending(false)
    }
  }

  const winner = teams[0]

  return (
    <div className="triv triv--play">
      <header className="triv-head triv-head--sm">
        <h1 className="triv-logo triv-logo--xs">TRIVIAL</h1>
        <p className="triv-room">
          {myTeam?.name ?? 'Equip'} · {myTeam?.score ?? 0} pts
          {phase?.startsWith('mg_') && ` · 🐎 ${myHorse}/5`}
        </p>
      </header>

      {game?.status === 'finished' && (
        <div className="triv-winner">🏆 Guanya <strong>{winner?.name ?? '—'}</strong></div>
      )}

      {phase === 'mg_horse' && !myAnswer && (
        <div className="triv-note triv-note--mini">🐎 Cursa! Respon ràpid per avançar</div>
      )}

      {answering && question && (
        myAnswer ? (
          <div className="triv-note">Resposta enviada! Espereu…</div>
        ) : (
          <div className="triv-opts triv-opts--play">
            {question.options.map((_, i) => (
              <button key={i} className={`triv-opt ${COLORS[i]}`} disabled={sending} onClick={() => answer(i)}>
                {SHAPES[i]}
              </button>
            ))}
          </div>
        )
      )}

      {revealing && (
        <div className="triv-note">
          {myAnswer
            ? myAnswer.correct
              ? phase === 'mg_horse_reveal'
                ? '✅ Correcte! El teu cavall avança 🐎'
                : `✅ Correcte! +${myAnswer.points} punts`
              : '❌ No heu encertat'
            : 'No heu respost'}
          {correctIndex != null && question && (
            <p className="triv-correct">Resposta: {SHAPES[correctIndex]} {question.options[correctIndex]}</p>
          )}
        </div>
      )}

      {phase === 'mg_horse_done' && (
        <div className="triv-note">🏁 Cursa acabada! Mira la pantalla.</div>
      )}

      {phase === 'mg_penals' && penals && teamId && (
        <PenalsView
          state={penals}
          teams={teams}
          mode="player"
          myTeamId={teamId}
          onChoose={(z) => game && penalsChoose(game.id, teamId, z).catch((e) => console.error(e))}
        />
      )}
      {phase === 'mg_penals_done' && (
        <div className="triv-note">⚽ Penals acabats! Mira la pantalla.</div>
      )}

      {phase === 'mg_bomba' && bomba && teamId && (
        <BombaView
          state={bomba}
          teams={teams}
          mode="player"
          myTeamId={teamId}
          onPass={() => game && bombaPass(game.id, teamId).catch((e) => console.error(e))}
        />
      )}
      {(phase === 'mg_bomba_boom' || phase === 'mg_bomba_done') && (
        <div className="triv-note">💥 Mira la pantalla!</div>
      )}

      {phase === 'mg_emoji' && emoji && teamId && (
        <EmojiView
          state={emoji}
          teams={teams}
          mode="player"
          myTeamId={teamId}
          onAnswer={(c) => game && emojiAnswer(game.id, teamId, c).catch((e) => console.error(e))}
        />
      )}
      {phase === 'mg_emoji_done' && (
        <div className="triv-note">😀 Mira la pantalla!</div>
      )}

      {(phase === 'lobby' || game?.status === 'waiting') && (
        <div className="triv-note">Espereu que comenci la partida…</div>
      )}
    </div>
  )
}
