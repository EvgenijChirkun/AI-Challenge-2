import { Star } from 'lucide-react';
import type { ParticipantViewModel } from '../types/leaderboard';

interface PodiumProps {
  participants: ParticipantViewModel[];
}

const avatarPairs = [
  ['#20a7df', '#8bd5f5'],
  ['#2448bf', '#79b8ff'],
  ['#0f766e', '#6ee7d8'],
  ['#8f5cf6', '#cbb8ff'],
  ['#1d4ed8', '#93c5fd'],
  ['#ca8a04', '#fde68a'],
];

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getAvatarGradient(seed: string) {
  const index =
    seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarPairs.length;
  const [start, end] = avatarPairs[index];
  return `linear-gradient(135deg, ${start}, ${end})`;
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
