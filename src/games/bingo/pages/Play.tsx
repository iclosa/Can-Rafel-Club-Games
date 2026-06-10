import '../bingo.css'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useBingoSync } from '../useBingoSync'
import { claimBingo, fetchPlayerCard } from '../bingoService'
import type { BingoCard, WinKind } from '../types'

export default function BingoPlay() {
  const { code } = useParams<{ code: string }>()
  const { game, wins, called, loading } = useBingoSync(code ?? null)
  const playerId = code ? localStorage.getItem(`bingo:playerId:${code}`) : null

  const [card, setCard] = useState<BingoCard | null>(null)
  const [marks, setMarks] = useState<Set<number>>(new Set())
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!game || !playerId || card) return
    fetchPlayerCard(game.id, playerId)
      .then((c) => setCard(c))
      .catch((e) => console.error('[bingo] card', e))
  }, [game, playerId, card])

  const toggle = (cell: number) => {
    setMarks((prev) => {
      const next = new Set(prev)
      if (next.has(cell)) next.delete(cell)
      else next.add(cell)
      return next
    })
  }

  const claim = async (kind: WinKind) => {
    if (!card) return
    setFeedback(null)
    try {
      const ok = await claimBingo(card.id, kind)
      setFeedback(ok ? (kind === 'bingo' ? '🎉 BINGO!' : '✅ Línia!') : 'Encara no… escolta bé!')
    } catch {
      setFeedback('Error en cantar.')
    }
  }

  const cells = card ? [...card.cells].sort((a, b) => a.cell - b.cell) : []
  const status = game?.status
  const bingoWin = wins.find((w) => w.kind === 'bingo')

  return (
    <div className="bingo bingo--play">
      <header className="bingo-head bingo-head--sm">
        <h1 className="bingo-logo bingo-logo--sm">BINGO</h1>
        <p className="bingo-room">Cartró #{card?.serial ?? '—'} · {called.length} boles</p>
      </header>

      {loading && <p className="bingo-muted">Connectant…</p>}

      {status === 'waiting' && <div className="bingo-note">Espera que comenci la partida…</div>}

      {status === 'finished' && (
        <div className="bingo-win-screen">
          🏆 Bingo de <strong>{bingoWin?.nickname ?? '—'}</strong>
        </div>
      )}

      {status === 'playing' && card && (
        <>
          <div className="bingo-card-grid">
            {cells.map((c) => (
              <button
                key={c.cell}
                className={`bingo-cell-btn${marks.has(c.cell) ? ' marked' : ''}`}
                onClick={() => toggle(c.cell)}
              >
                <span className="bcell-title">{c.song?.song_title}</span>
                <span className="bcell-artist">{c.song?.artist}</span>
              </button>
            ))}
          </div>

          {feedback && <p className="bingo-feedback">{feedback}</p>}

          <div className="bingo-claim-row">
            <button onClick={() => claim('line')}>Cantar LÍNIA</button>
            <button className="primary" onClick={() => claim('bingo')}>
              Cantar BINGO
            </button>
          </div>
        </>
      )}

      {wins.filter((w) => w.kind === 'line').length > 0 && status === 'playing' && (
        <p className="bingo-muted">
          Línia cantada per {wins.filter((w) => w.kind === 'line').map((w) => w.nickname).join(', ')}
        </p>
      )}
    </div>
  )
}
