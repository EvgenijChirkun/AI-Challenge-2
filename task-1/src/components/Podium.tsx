import { Star } from 'lucide-react';
import type { ParticipantViewModel } from '../types/leaderboard';
import { getAvatarGradient, getInitials } from '../utils/avatar';

interface PodiumProps {
  participants: ParticipantViewModel[];
}

export function Podium({ participants }: PodiumProps) {
  if (participants.length === 0) {
    return null;
  }

  return (
    <section className="podium" aria-label="Top participants podium">
      {participants.map((vm) => (
        <div key={vm.participant.id} className={`podium-item podium-item--place-${vm.rank}`}>
          <div className="podium-item__info">
            <div className="podium-item__avatar-wrap">
              <div
                className="podium-avatar"
                style={{ backgroundImage: getAvatarGradient(vm.participant.avatarSeed) }}
                aria-hidden="true"
              >
                {getInitials(vm.participant.displayName)}
              </div>
              <span className="podium-rank-badge" aria-hidden="true">
                {vm.rank}
              </span>
            </div>
            <strong className="podium-item__name">{vm.participant.displayName}</strong>
            <span className="podium-item__role">{vm.participant.roleTitle}</span>
            <span className="podium-item__score">
              <Star className="podium-item__score-icon" aria-hidden="true" />
              <span>{vm.totalPoints}</span>
            </span>
          </div>
          <div className="podium-item__block" aria-hidden="true">
            <span className="podium-item__block-rank">{vm.rank}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
