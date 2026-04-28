import { Trophy } from 'lucide-react';
import type { ParticipantViewModel } from '../types/leaderboard';

interface PodiumProps {
  participants: ParticipantViewModel[];
}

export function Podium({ participants }: PodiumProps) {
  if (participants.length === 0) {
    return null;
  }

  return (
    <section className="podium" aria-label="Top participants podium">
      {participants.map((participant) => (
        <article
          key={participant.participant.id}
          className={`podium-card podium-card--place-${participant.rank}`}
        >
          <span className="podium-card__place">#{participant.rank}</span>
          <div className="podium-card__crown">
            <Trophy aria-hidden="true" />
          </div>
          <strong className="podium-card__name">{participant.participant.displayName}</strong>
          <span className="podium-card__role">{participant.participant.roleTitle}</span>
          <span className="podium-card__score">{participant.totalPoints} pts</span>
        </article>
      ))}
    </section>
  );
}
