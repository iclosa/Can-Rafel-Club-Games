import './globby.css'
import type { ReactNode } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'

interface Props {
  theme: 'hitster' | 'bingo' | 'trivial'
  title: string
  subtitle: string
  code: string
  joinUrl: string
  qrHint?: string
  alert?: ReactNode
  children: ReactNode
}

// Maqueta de lobby comuna a tots els jocs: mateixes dimensions, etiqueta "Club
// Esportiu Can Rafel" i subtítol del joc. El color/tema el posa la classe
// globby--<theme> (variables CSS); el contingut del panell dret és children.
export default function GameLobby({
  theme,
  title,
  subtitle,
  code,
  joinUrl,
  qrHint = 'Escaneja amb el mòbil per unir-te',
  alert,
  children,
}: Props) {
  const navigate = useNavigate()
  return (
    <div className={`globby globby--${theme}`}>
      <button className="globby-back" onClick={() => navigate('/')}>
        ← Menú principal
      </button>

      <header className="globby-head">
        <span className="globby-kicker">Club Esportiu Can Rafel</span>
        <h1 className="globby-title">{title}</h1>
        <p className="globby-sub">{subtitle}</p>
      </header>

      {alert}

      <main className="globby-main">
        <section className="globby-panel globby-qr">
          <div className="globby-qr-frame">
            <QRCodeSVG value={joinUrl} size={240} bgColor="#ffffff" fgColor="#0a0a0a" />
          </div>
          <p className="globby-hint">{qrHint}</p>
          <div className="globby-code">
            <span>Codi de sala</span>
            <strong>{code}</strong>
          </div>
        </section>

        <section className="globby-panel globby-content">{children}</section>
      </main>
    </div>
  )
}
