import { ChevronDown, ChevronUp, Star } from 'lucide-react';
import type { Category, ParticipantViewModel } from '../types/leaderboard';
import { ActivityDetails } from './ActivityDetails';
import { CategoryIcon } from './CategoryIcon';

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

const allCategories: Category[] = ['education', 'publicSpeaking', 'universityPartnership'];

export function ParticipantCard({ participant, isExpanded, onToggle }: ParticipantCardProps) {
  const person = participant.participant;

  const activeCategories = allCategories.filter((cat) => participant.categoryTotals[cat] > 0);

  return (
    <article className={`participant-card${isExpanded ? ' participant-card--expanded' : ''}`}>
      <div className="participant-card__summary">
        <div className="participant-card__identity">
          <span className="participant-card__rank">{participant.rank}</span>
          <span
            className="participant-card__avatar"
            style={{ backgroundImage: getAvatarGradient(person.avatarSeed) }}
            aria-hidden="true"
          >
            {getInitials(person.displayName)}
          </span>
          <div className="participant-card__person">
            <strong>{person.displayName}</strong>
            <span>{person.roleTitle}</span>
          </div>
        </div>

        <div className="participant-card__metrics">
          {activeCategories.map((cat) => (
            <div key={cat} className="metric-item">
              <CategoryIcon category={cat} className="metric-item__icon" />
              <span className="metric-item__value">{participant.categoryTotals[cat]}</span>
            </div>
          ))}
        </div>

        <div className="participant-card__sep" aria-hidden="true" />

        <div className="participant-card__total">
          <span className="total-label">Total</span>
          <div className="total-score">
            <Star className="total-star" aria-hidden="true" />
            <span className="total-value">{participant.totalPoints}</span>
          </div>
        </div>

        <button
          type="button"
          className="participant-card__toggle"
          onClick={() => onToggle(person.id)}
          aria-expanded={isExpanded}
          aria-controls={`activity-panel-${person.id}`}
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          {isExpanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </button>
      </div>

      {isExpanded ? (
        <div id={`activity-panel-${person.id}`}>
          <ActivityDetails participant={participant} />
        </div>
      ) : null}
    </article>
  );
}
