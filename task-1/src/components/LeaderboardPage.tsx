import { useMemo, useState } from 'react';
import { mockParticipants } from '../data/mockLeaderboard';
import type { LeaderboardFilters } from '../types/leaderboard';
import { applySearch, getLeaderboardView } from '../utils/leaderboardFilters';
import { getTopThree, shouldShowPodium } from '../utils/leaderboardRanking';
import { FilterBar } from './FilterBar';
import { ParticipantList } from './ParticipantList';
import { Podium } from './Podium';

const defaultFilters: LeaderboardFilters = {
  year: 'all',
  quarter: 'all',
  category: 'all',
  search: '',
};

export function LeaderboardPage() {
  const [filters, setFilters] = useState<LeaderboardFilters>(defaultFilters);
  const [expandedParticipantId, setExpandedParticipantId] = useState<string | null>(null);

  const baseLeaderboard = useMemo(
    () =>
      getLeaderboardView(mockParticipants, {
        year: filters.year,
        quarter: filters.quarter,
        category: filters.category,
      }),
    [filters.category, filters.quarter, filters.year],
  );

  const visibleLeaderboard = useMemo(
    () => applySearch(baseLeaderboard, filters.search),
    [baseLeaderboard, filters.search],
  );

  const podiumTopThree = useMemo(() => getTopThree(baseLeaderboard), [baseLeaderboard]);
  const showPodium = useMemo(
    () =>
      shouldShowPodium(
        podiumTopThree.map((entry) => entry.participant.id),
        visibleLeaderboard.map((entry) => entry.participant.id),
        filters.search,
      ),
    [filters.search, podiumTopThree, visibleLeaderboard],
  );

  const visiblePodiumParticipants = useMemo(() => {
    if (!showPodium) {
      return [];
    }

    if (!filters.search.trim()) {
      return podiumTopThree;
    }

    const visibleIds = new Set(visibleLeaderboard.map((entry) => entry.participant.id));
    return podiumTopThree.filter((entry) => visibleIds.has(entry.participant.id));
  }, [filters.search, podiumTopThree, showPodium, visibleLeaderboard]);

  function handleToggleParticipant(id: string) {
    setExpandedParticipantId((current) => (current === id ? null : id));
  }

  return (
    <main className="leaderboard-page">
      <div className="leaderboard-shell">
        <header className="leaderboard-header">
          <h1>Leaderboard</h1>
          <p className="leaderboard-header__subtitle">
            Top performers based on contributions and activity.
          </p>
        </header>

        <FilterBar filters={filters} onFilterChange={setFilters} />

        <Podium participants={visiblePodiumParticipants} />

        <ParticipantList
          participants={visibleLeaderboard}
          expandedParticipantId={expandedParticipantId}
          onToggleParticipant={handleToggleParticipant}
        />
      </div>
    </main>
  );
}
