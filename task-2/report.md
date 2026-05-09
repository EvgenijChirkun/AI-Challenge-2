# Gather — Build Report

A short report covering architecture, decisions, and trade-offs for the Gather
challenge submission. The full usage guide lives in `README.md`.

## What the app does

Gather is a lightweight event hosting and attendance platform for free,
community-style events. It implements the full flow:

**Publish → RSVP → Ticket → Check-in**, plus post-event feedback, a moderated
gallery, and a host review queue.

## Tech stack

- **Framework:** TanStack Start v1 (React 19, Vite 7) with file-based routing
- **Styling:** Tailwind CSS v4 with semantic tokens in `src/styles.css`
- **Backend:** Lovable Cloud (managed Supabase) — Postgres, RLS, Auth, Storage
- **State:** `@tanstack/react-query` for server state, React context for auth
- **QR codes:** `qrcode.react`

## Architecture decisions

### Roles via `host_members`, not user metadata
Roles (`host`, `checker`) are stored in a dedicated `host_members` table keyed
by `(host_id, user_id)`. Permission checks use `SECURITY DEFINER` SQL helpers
(`has_host_role`, `has_checker_or_host_role`, `is_host_member`) which are
called from RLS policies and RPCs. This keeps role logic server-side and
avoids the recursive RLS pitfalls of self-referencing policies.

### Atomic mutations as RPCs
All sensitive flows are implemented as `SECURITY DEFINER` Postgres functions:

- `create_or_update_rsvp` — capacity check + waitlist position assignment
- `cancel_rsvp` — cancel + auto-promote next waitlisted attendee (FIFO)
- `check_in_ticket` — validates ticket, event, status, and prevents duplicates
- `undo_check_in` — soft undo via `undone_at` (no row deletion)
- `accept_host_invite` — token validation + member insert
- `submit_event_feedback` — gates by event end + RSVP
- `review_report` — host-only moderation
- `export_event_rsvps` — host-only CSV data source

Each RPC verifies `auth.uid()` and role membership, so a hostile client
cannot bypass UI checks.

### Soft-state instead of hard deletes
- Cancellations set `status='canceled'` and `canceled_at`
- Undone check-ins set `undone_at` instead of deleting the row
- Hidden events/photos use a `hidden` boolean

This preserves history for audit and counts (e.g. CSV exports correctly skip
undone check-ins).

### CSV export
`export_event_rsvps` returns `(name, email, rsvp_status, check_in_time)` for
host-only callers. The frontend (`src/lib/csv.ts`) prepends a UTF-8 BOM and
escapes commas/quotes/newlines per RFC 4180, so the file opens cleanly in
Excel and Google Sheets.

## Trade-offs and MVP limitations

- **Paid events:** UI exposes a Free/Paid toggle with Paid disabled and a
  "Coming soon" tooltip; `is_paid` is always `false`. No payment integration.
- **No camera-based QR scanning:** check-in is manual code entry only, per
  challenge wording. The QR code displayed on the ticket encodes the same
  short code attendees can read aloud.
- **No transactional email:** ticket details are shown in-app at
  `/tickets/:code` and exportable to calendar via `.ics`. There is no
  outbound email worker.
- **No realtime channels:** dashboard counts and check-in counters refresh
  via `react-query` invalidation after each mutation rather than postgres
  changes subscriptions. Adequate for the expected scale.
- **Single-host registration UI:** any signed-in user can register a new host
  via `/host/register`; multi-host management is supported through the host
  switcher on the dashboard.
- **No password reset page:** Supabase magic-link auth is configured, but a
  dedicated `/reset-password` route is out of scope for the MVP.

## Security posture

- No service role key in the frontend bundle (`SUPABASE_SERVICE_ROLE_KEY` is
  only available to server-side migrations, never imported in `src/`).
- Every app table has RLS enabled with explicit `SELECT/INSERT/UPDATE/DELETE`
  policies. `events` for example is publicly readable only when
  `status='published' AND hidden=false`, otherwise restricted to host members.
- All mutating RPCs verify `auth.uid()` is non-null and that the caller has
  the appropriate role for the target host.
- Storage buckets (`host-logos`, `cover-images`, `gallery-photos`) are
  public-read but write-restricted via RLS on `storage.objects`.

## Demo data

The seed migration creates:

- One host: **Open Community Lab** (`gatheradmin@example.com` / `GatherAdmin2025!`)
- One upcoming event with one going attendee and one waitlisted attendee
- One past event with one checked-in attendee
- One pending gallery photo on the upcoming event
- One open report on the upcoming event

## Files of interest

- `supabase/migrations/` — schema + RPCs + seed
- `src/routes/` — file-based pages
- `src/lib/csv.ts` — RFC 4180 CSV builder
- `src/lib/event-counts.ts` — Going / Waitlist / Checked-in hook
- `artifacts/sample-rsvp-export.csv` — sample CSV export
