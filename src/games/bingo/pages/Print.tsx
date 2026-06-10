import '../bingo.css'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBingoSync } from '../useBingoSync'
import { fetchPrintableCards } from '../bingoService'
import type { BingoCard } from '../types'

export default function BingoPrint() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { game } = useBingoSync(code ?? null)
  const [cards, setCards] = useState<BingoCard[]>([])

  useEffect(() => {
    if (!game) return
    fetchPrintableCards(game.id)
      .then(setCards)
      .catch((e) => console.error('[bingo] print', e))
  }, [game])

  return (
    <div className="bingo-print-page">
      <div className="bingo-print-toolbar">
        <button onClick={() => navigate(`/bingo/host/${code}`)}>← Tornar</button>
        <span>
          {cards.length} cartrons · sala {code}
        </span>
        <button className="primary" onClick={() => window.print()}>
          Imprimeix / Desa PDF
        </button>
      </div>

      <div className="bingo-print-sheet">
        {cards.map((card) => {
          const cells = [...card.cells].sort((a, b) => a.cell - b.cell)
          return (
            <div key={card.id} className="print-card">
              <div className="print-card-head">
                <span className="print-card-logo">BINGO MUSICAL</span>
                <span className="print-card-serial">#{card.serial}</span>
              </div>
              <div className="print-card-grid">
                {cells.map((c) => (
                  <div key={c.cell} className="print-cell">
                    <span className="print-cell-title">{c.song?.song_title}</span>
                    <span className="print-cell-artist">{c.song?.artist}</span>
                  </div>
                ))}
              </div>
              <div className="print-card-foot">Club Esportiu Can Rafel</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
