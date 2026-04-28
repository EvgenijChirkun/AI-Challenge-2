import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ParticipantViewModel } from '../types/leaderboard';
import { ActivityDetails } from './ActivityDetails';
import { ScoreBadge } from './ScoreBadge';

interface ParticipantCardProps {
  participant: ParticipantViewModel;
  isExpanded: boolean;
  onToggle: (id: string) => void;
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

export function ParticipantCard({ participant, isExpanded, onToggle }: ParticipantCardProps) {
  return (
    <article className={`participant-card${isExpanded ? ' participant-card--expanded' : ''}`}>
      <div className="participant-card__summary">
        <div className="participant-card__identity">
          <span className="participant-card__rank">#{participant.rank}</span>
          <span
            className="participant-card__avatar"
            style={{ backgroundImage: getAvatarGradient(participant.participant.avatarSeed) }}
            aria-hidden="true"
          >
            {getInitials(participant.participant.displayName)}
          </span>
          <span className="participant-card__person">
            <strong>{participant.participant.displayName}</strong>
            <span>{participant.participant.roleTitle}</span>
          </span>
        </div>

        <div className="participant-card__scores">
          <ScoreBadge
            value={participant.categoryTotals.education}
            category="education"
            label="Education"
          />
          <ScoreBadge
            value={participant.categoryTotals.publicSpeaking}
            category="publicSpeaking"
            label="Speaking"
          />
          <ScoreBadge
            value={participant.categoryTotals.universityPartnership}
            category="universityPartnership"
            label="University"
          />
          <ScoreBadge value={participant.totalPoints} label="Total" highlight />
        </div>

        <button
          type="button"
          className="participant-card__toggle"
          onClick={() => onToggle(participant.participant.id)}
          aria-expanded={isExpanded}
          aria-controls={`activity-panel-${participant.participant.id}`}
        >
          {isExpanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
        </button>
      </div>

      {isExpanded ? (
        <div id={`activity-panel-${participant.participant.id}`}>
          <ActivityDetails participant={participant} />
        </div>
      ) : null}
    </article>
  );
}
