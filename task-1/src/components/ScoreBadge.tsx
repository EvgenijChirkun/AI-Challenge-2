import { Star } from 'lucide-react';
import type { Category } from '../types/leaderboard';
import { CategoryIcon } from './CategoryIcon';

interface ScoreBadgeProps {
  value: number;
  category?: Category;
  label: string;
  highlight?: boolean;
}

export function ScoreBadge({ value, category, label, highlight = false }: ScoreBadgeProps) {
  return (
    <div
      className={`score-badge${highlight ? ' score-badge--highlight' : ''}`}
      aria-label={`${label}: ${value} points`}
    >
      <span className="score-badge__icon">
        {category ? (
          <CategoryIcon category={category} className="score-badge__svg" />
        ) : (
          <Star className="score-badge__svg" aria-hidden="true" />
        )}
      </span>
      <span className="score-badge__text">{value}</span>
      <span className="score-badge__label">{label}</span>
    </div>
  );
}
