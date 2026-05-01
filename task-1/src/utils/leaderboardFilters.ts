import type { LeaderboardFilters, Participant, ParticipantViewModel } from '../types/leaderboard';

const emptyTotals = {
  education: 0,
  publicSpeaking: 0,
  universityPartnership: 0,
} as const;

export function getLeaderboardView(
  participants: Participant[],
  filters: Omit<LeaderboardFilters, 'search'>,
): ParticipantViewModel[] {
  const rankedParticipants = participants
    .map((participant) => {
      const visibleActivities = participant.activities
        .filter((activity) => filters.year === 'all' || activity.year === filters.year)
        .filter((activity) => filters.quarter === 'all' || activity.quarter === filters.quarter)
        .filter((activity) => filters.category === 'all' || activity.category === filters.category)
        .sort((left, right) => right.date.localeCompare(left.date));

      const categoryTotals = visibleActivities.reduce((totals, activity) => {
        totals[activity.category] += activity.points;
        return totals;
      }, { ...emptyTotals });

      const totalPoints = visibleActivities.reduce((sum, activity) => sum + activity.points, 0);

      return {
        participant,
        totalPoints,
        categoryTotals,
        visibleActivities,
      };
    })
    .filter((participant) => participant.totalPoints > 0)
    .sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) {
        return right.totalPoints - left.totalPoints;
      }

      return left.participant.displayName.localeCompare(right.participant.displayName);
    })
    .map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }));

  return rankedParticipants;
}

export function applySearch(
  rankedParticipants: ParticipantViewModel[],
  search: string,
): ParticipantViewModel[] {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return rankedParticipants;
  }

  return rankedParticipants.filter((entry) =>
    entry.participant.displayName.toLowerCase().includes(normalizedSearch),
  );
}
