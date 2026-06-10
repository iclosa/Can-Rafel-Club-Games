import type { Team, TeamCard } from '../types/db'

interface Props {
  teams: Team[]
  teamCards: TeamCard[]
  highlightTeamId?: string | null
  winningCards?: number
}

// Marcador dels jugadors: puntuació (cartes col·locades) i comodins.
// Cada "equip" és un jugador (el nom de l'equip és el seu nick).
export default function TeamsReveal({ teams, teamCards, highlightTeamId, winningCards }: Props) {
  return (
    <div className="teams-reveal">
      {teams.map((team, i) => {
        const score = teamCards.filter((tc) => tc.team_id === team.id).length
        return (
          <div
            key={team.id}
            className={`team-card${team.id === highlightTeamId ? ' team-card--me' : ''}`}
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            <h3>{team.name}</h3>
            <div className="team-stats">
              <span className="team-score">
                🎵 {score}
                {winningCards ? ` / ${winningCards}` : ''}
              </span>
              <span className="team-jokers" title="Fitxes restants">
                {team.jokers <= 0 ? '—' : team.jokers <= 5 ? '💿'.repeat(team.jokers) : `💿×${team.jokers}`}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
