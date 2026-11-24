import './howto.css'
import { useEffect, useState } from 'react'
import { GAMES } from './gamesCatalog'

// Botó "Com es juga" + finestra amb les instruccions bàsiques del joc.
export default function HowToPlay({ gameId }: { gameId: string }) {
  const [open, setOpen] = useState(false)
  const game = GAMES.find((g) => g.id === gameId)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!game || game.howTo.length === 0) return null

  return (
    <>
      <button type="button" className="howto-btn" onClick={() => setOpen(true)}>
        ❓ Com es juga
      </button>
      {open && (
        <div className="howto-backdrop" onClick={() => setOpen(false)}>
          <div
            className="howto-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Com es juga a ${game.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="howto-title">
              {game.emoji} Com es juga a {game.name}
            </h2>
            <ol className="howto-steps">
              {game.howTo.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <button type="button" className="howto-close" onClick={() => setOpen(false)}>
              Entesos!
            </button>
          </div>
        </div>
      )}
    </>
  )
}
