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
      <div className="filter-card__grid">
        <label className="filter-field">
          <span className="filter-field__label">Year</span>
          <select
            className="filter-field__control"
            value={String(filters.year)}
            onChange={(event) =>
              updateFilter(
                'year',
                event.target.value === 'all' ? 'all' : Number(event.target.value),
              )
            }
          >
            <option value="all">All Years</option>
            <option value="2025">2025</option>
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-field__label">Quarter</span>
          <select
            className="filter-field__control"
            value={filters.quarter}
            onChange={(event) => updateFilter('quarter', event.target.value as 'all' | Quarter)}
          >
            {quarterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-field__label">Category</span>
          <select
            className="filter-field__control"
            value={filters.category}
            onChange={(event) => updateFilter('category', event.target.value as 'all' | Category)}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field filter-field--search">
          <span className="filter-field__label">Employee</span>
          <span className="filter-search">
            <Search className="filter-search__icon" aria-hidden="true" />
            <input
              className="filter-field__control filter-field__control--search"
              type="search"
              placeholder="Search participant"
              value={filters.search}
              onChange={handleSearchChange}
            />
          </span>
        </label>
      </div>
    </section>
  );
}
