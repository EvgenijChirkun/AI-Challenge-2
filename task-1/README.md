# Task 1 - Static Leaderboard Replica

This task recreates a leaderboard interface as a static frontend built with React and TypeScript. The page includes filter controls, a podium for top performers, a ranked participant list, and expandable activity details.

## Project Overview

Task 1 is a static leaderboard replica for an AI challenge. It renders synthetic participant performance data with:

- year, quarter, category, and participant search filters
- a top-3 podium section
- a ranked participant list with stable ranks after search
- per-category score indicators
- expandable recent activity details

The application is fully client-side and uses only local mock data.

## Tech Stack

- Vite
- React
- TypeScript
- CSS
- lucide-react
- GitHub Pages

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Deployed Link

https://evgenijchirkun.github.io/AI-Challenge-2/task-1/

## Data Note

All participants, roles, avatars, activities, dates, and scores in this task are fully synthetic mock data created for the challenge. The app is static and does not use a backend, authentication, analytics, or external APIs.

## Features

- Filter leaderboard results by year, quarter, and category
- Search participants progressively by display name
- Preserve rank numbers after search by applying search after ranking
- Show or hide the podium based on the current top-3 and search visibility rules
- Expand one participant card at a time to inspect visible activities
- Display category totals and total score for each participant

## Implementation Notes

- Base leaderboard results are computed from synthetic activities after year, quarter, and category filters are applied.
- Participants with zero visible points are removed.
- Total and per-category scores are recalculated from visible activities.
- Ranking is assigned before search filtering so visible results keep their original rank values.
- The podium is derived from the base filtered leaderboard and then conditionally shown depending on search results.

## Project Structure

| Path                              | Description                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `src/App.tsx`                     | Application entry component                                                      |
| `src/components/`                 | UI components for filters, podium, list rows, score badges, and activity details |
| `src/data/mockLeaderboard.ts`     | Synthetic participant and activity dataset                                       |
| `src/types/leaderboard.ts`        | Shared TypeScript data model                                                     |
| `src/utils/leaderboardFilters.ts` | Filtering, scoring, ranking, and search helpers                                  |
| `src/utils/leaderboardRanking.ts` | Podium helper logic                                                              |
| `src/styles/`                     | Global and page-level styles                                                     |
| `vite.config.ts`                  | Vite config with GitHub Pages base path                                          |

## How to Run Locally

```bash
cd task-1
npm install
npm run dev
```

## Build for GitHub Pages

- Production base path: `/AI-Challenge-2/task-1/`
- Deployment workflow: `.github/workflows/deploy-task-1.yml`
- Output directory: `task-1/dist`

## Source Data

The leaderboard uses only synthetic mock participants, synthetic role titles, synthetic activity titles, generated avatar placeholders, and synthetic scores. No real corporate, employee, or personal data is included.

## Verification

- Install dependencies with `npm install`
- Build with `npm run build`
- Confirm GitHub Pages deployment uses the configured Vite base path

## Notes

This task implements only the static frontend replica requested for `task-1`. It does not include any backend services, API routes, persistence, authentication, or analytics.
