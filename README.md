# AI Challenge 2

A public repository for AI Challenge submissions. Each task is isolated in its own folder with its own source code, documentation, deployment notes, and required artifacts.

## Repository Structure

| Folder    | Description                             |
| --------- | --------------------------------------- |
| `task-1/` | Static leaderboard replica              |
| `task-2/` | Event hosting and attendance platform   |
| `task-3/` | Telegram AI learning assistant with n8n |
| `task-4/` | Placeholder for future task             |

## Task 1: Leaderboard Replica

A static React/TypeScript implementation of a company-style leaderboard replica.

- Source: `task-1/`
- Report: `task-1/report.md`
- Deployment: `https://evgenijchirkun.github.io/AI-Challenge-2/task-1/`
- Data note: uses synthetic mock data only; no real corporate or personal data is included.

## Task 2: Event Hosting and Attendance Platform

A Lovable + Supabase application for free community-style events.

Core flow:

**Publish → RSVP → Ticket → Check-in**

- Source: `task-2/`
- Usage guide: `task-2/README.md`
- Report: `task-2/report.md`
- Sample CSV: `task-2/artifacts/sample-rsvp-export.csv`
- Live demo: `https://community-event-dash.lovable.app`

Implemented capabilities include:

- Host registration and public Host pages
- Event creation, publishing, unpublishing, and duplication
- Explore page with search, date, location, and past-event filters
- RSVP, tickets, QR codes, capacity enforcement, and FIFO waitlist
- Manual check-in with duplicate prevention and undo
- Host and Checker roles with invite links
- My Events and Host Dashboard
- CSV export for RSVP and attendance data
- Post-event feedback, gallery approval, reports, and review queue

## Task 3: Telegram AI Learning Assistant

An n8n workflow that implements a Telegram-based AI learning assistant.

Core flow:

**Learn from URL → Save material → Generate quiz → Answer questions → Score**

- Source: `task-3/`
- Usage guide: `task-3/README.md`
- Report: `task-3/report.md`
- Workflow export: `task-3/workflow.json`

Implemented capabilities include:

- Telegram bot commands: `/start`, `/learn <url>`, and `/quiz`
- URL fetching and content extraction
- Teacher AI role for summarizing learning materials
- Persistent storage of saved materials in n8n Data Tables
- Dynamic material selection from all saved topics
- Examiner AI role for generating five multiple-choice quiz questions
- One-question-at-a-time Telegram quiz flow
- Inline answer buttons with callback handling
- Quiz sessions with persisted progress, answers, and score
- Final score and per-question feedback after quiz completion

## Responsible AI / Data Safety

- Task 1 uses synthetic mock data only.
- No real corporate or personal data is included.
- Task 2 demo accounts and seeded data are for challenge review only.
- Task 3 stores only Telegram user IDs and user-submitted learning URLs/content needed for the bot workflow.
- `.env` files, API keys, Telegram bot tokens, OpenAI keys, Supabase service role secrets, and other credentials should not be committed.

## Development Notes

- Each task is isolated in its own folder.
- See each task folder for task-specific setup, usage, implementation details, and artifacts.
- Task 2 was built with Lovable and Supabase, then copied into `task-2` for repository submission.
- Task 3 was built in n8n Cloud and exported as `task-3/workflow.json`.
