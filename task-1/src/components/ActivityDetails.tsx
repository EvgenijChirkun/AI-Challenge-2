import type { Category, ParticipantViewModel } from '../types/leaderboard';
import { CategoryIcon } from './CategoryIcon';

interface ActivityDetailsProps {
  participant: ParticipantViewModel;
}

const categoryLabels: Record<Category, string> = {
  education: 'Education',
  publicSpeaking: 'Public Speaking',
  universityPartnership: 'Univ. Partnership',
};

export function ActivityDetails({ participant }: ActivityDetailsProps) {
  return (
    <div className="activity-details">
      <p className="activity-details__label">Recent Activity</p>
      <div className="activity-table" role="table">
        <div className="activity-table__head" role="row">
          <span className="activity-table__head-cell" role="columnheader">
            Activity
          </span>
          <span className="activity-table__head-cell" role="columnheader">
            Category
          </span>
          <span className="activity-table__head-cell" role="columnheader">
            Date
          </span>
          <span
            className="activity-table__head-cell activity-table__head-cell--right"
            role="columnheader"
          >
            Points
          </span>
        </div>
        {participant.visibleActivities.map((activity) => (
          <div className="activity-table__row" key={activity.id} role="row">
            <span className="activity-row__title" role="cell">
              {activity.title}
            </span>
            <span role="cell">
              <span
                className={`activity-category-pill activity-category-pill--${activity.category}`}
              >
                <CategoryIcon
                  category={activity.category}
                  className="activity-category-pill__icon"
                />
                {categoryLabels[activity.category]}
              </span>
            </span>
            <span className="activity-row__date" role="cell">
              {(() => {
                const [year, month, day] = activity.date.split('-').map(Number);
                return new Date(year, month - 1, day).toLocaleDateString();
              })()}
            </span>
            <span className="activity-row__points-cell" role="cell">
              +{activity.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
