import type { Category, ParticipantViewModel } from '../types/leaderboard';
import { CategoryIcon } from './CategoryIcon';

interface ActivityDetailsProps {
  participant: ParticipantViewModel;
}

const categoryLabels: Record<Category, string> = {
  education: 'Education',
  publicSpeaking: 'Public Speaking',
  universityPartnership: 'University Partnership',
};

export function ActivityDetails({ participant }: ActivityDetailsProps) {
  return (
    <div className="activity-details">
      <div className="activity-details__header">
        <h3>Recent Activities</h3>
        <span>{participant.visibleActivities.length} visible entries</span>
      </div>

      <div className="activity-details__table" role="list">
        {participant.visibleActivities.map((activity) => (
          <div className="activity-row" key={activity.id} role="listitem">
            <div className="activity-row__main">
              <span className="activity-row__title">{activity.title}</span>
              <span className="activity-row__date">
                {new Date(activity.date).toLocaleDateString()}
              </span>
            </div>
            <div className="activity-row__meta">
              <span className={`category-pill category-pill--${activity.category}`}>
                <CategoryIcon category={activity.category} className="category-pill__icon" />
                {categoryLabels[activity.category]}
              </span>
              <span className="activity-row__points">+{activity.points}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
