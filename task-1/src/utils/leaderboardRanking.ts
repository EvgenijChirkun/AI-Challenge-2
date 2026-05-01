import type { ParticipantViewModel } from '../types/leaderboard';

export function getTopThree(rankedParticipants: ParticipantViewModel[]): ParticipantViewModel[] {
  return rankedParticipants.slice(0, 3);
}

export function shouldShowPodium(
  baseTopThreeIds: string[],
  visibleParticipantIds: string[],
  search: string,
): boolean {
  if (baseTopThreeIds.length < 3) {
    return false;
  }

  if (!search.trim()) {
    return true;
  }

  const visibleIds = new Set(visibleParticipantIds);
  return baseTopThreeIds.some((id) => visibleIds.has(id));
}
