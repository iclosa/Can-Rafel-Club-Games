import { Fragment } from 'react'
import type { TeamCard } from '../types/db'

interface Props {
  cards: TeamCard[]
  onPlace?: (position: number) => void
  disabled?: boolean
}

// Línia temporal d'un equip, ordenada per any. Si es passa onPlace, mostra
// botons d'espai (slots) entre/abans/després de cada carta per col·locar-hi
// la carta misteriosa. position 0 = abans de tot; n = després de tot.
export default function Timeline({ cards, onPlace, disabled }: Props) {
  const sorted = [...cards].sort((a, b) => a.position - b.position)
  const n = sorted.length

  return (
    <div className="timeline">
      {Array.from({ length: n + 1 }, (_, pos) => (
        <Fragment key={pos}>
          {onPlace && (
            <button
              className="tl-slot"
              disabled={disabled}
              onClick={() => onPlace(pos)}
              aria-label={`Col·loca a la posició ${pos}`}
            >
              +
            </button>
          )}
          {pos < n && (
            <div className="tl-card">
              <span className="tl-year">{sorted[pos].card?.year ?? '—'}</span>
              <span className="tl-title">{sorted[pos].card?.song_title ?? ''}</span>
            </div>
          )}
        </Fragment>
      ))}
    </div>
  )
}
