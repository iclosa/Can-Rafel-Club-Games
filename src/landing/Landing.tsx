import './landing.css'
import { useNavigate } from 'react-router-dom'
import { GAMES } from '../shared/gamesCatalog'

export default function Landing() {
  const navigate = useNavigate()
  return (
    <div className="landing">
      <header className="landing-head">
        <h1 className="landing-title">Club Can Rafel</h1>
        <p className="landing-sub">Tria un joc per començar</p>
      </header>

      <div className="landing-grid">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={`game-card${g.ready ? '' : ' game-card--soon'}`}
            onClick={() => g.ready && navigate(g.path)}
            disabled={!g.ready}
          >
            <span className="game-emoji">{g.emoji}</span>
            <span className="game-name">{g.name}</span>
            <span className="game-tagline">{g.tagline}</span>
            {!g.ready && <span className="game-soon">Pròximament</span>}
          </button>
        ))}
      </div>

      <footer className="landing-foot">Fet amb ♥ per Club Can Rafel</footer>
    </div>
  )
}
