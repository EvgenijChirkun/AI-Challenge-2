import { Search } from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { Category, LeaderboardFilters, Quarter } from '../types/leaderboard';

interface FilterBarProps {
  filters: LeaderboardFilters;
  onFilterChange: (nextFilters: LeaderboardFilters) => void;
}

const categoryOptions: Array<{ label: string; value: 'all' | Category }> = [
  { label: 'All Categories', value: 'all' },
  { label: 'Education', value: 'education' },
  { label: 'Public Speaking', value: 'publicSpeaking' },
  { label: 'University Partnership', value: 'universityPartnership' },
];

const quarterOptions: Array<{ label: string; value: 'all' | Quarter }> = [
  { label: 'All Quarters', value: 'all' },
  { label: 'Q1', value: 'Q1' },
  { label: 'Q2', value: 'Q2' },
  { label: 'Q3', value: 'Q3' },
  { label: 'Q4', value: 'Q4' },
];

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  function updateFilter<Key extends keyof LeaderboardFilters>(
    key: Key,
    value: LeaderboardFilters[Key],
  ) {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    updateFilter('search', event.target.value);
  }

  return (
    <section className="filter-card" aria-label="Leaderboard filters">
      <div className="filter-card__row">
        <select
          className="filter-select"
          value={String(filters.year)}
          onChange={(event) =>
            updateFilter('year', event.target.value === 'all' ? 'all' : Number(event.target.value))
          }
          aria-label="Year"
        >
          <option value="all">All Years</option>
          <option value="2025">2025</option>
        </select>

        <select
          className="filter-select"
          value={filters.quarter}
          onChange={(event) => updateFilter('quarter', event.target.value as 'all' | Quarter)}
          aria-label="Quarter"
        >
          {quarterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={filters.category}
          onChange={(event) => updateFilter('category', event.target.value as 'all' | Category)}
          aria-label="Category"
        >
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="filter-search-wrap">
          <Search className="filter-search-icon" aria-hidden="true" />
          <input
            className="filter-search-input"
            type="search"
            aria-label="Search employee"
            placeholder="Search employee..."
            value={filters.search}
            onChange={handleSearchChange}
          />
        </div>
      </div>
    </section>
  );
}
