# Gather

A lightweight event hosting and attendance platform for free community-style events.
Core flow (in progress): **Publish → RSVP → Ticket → Check-in**.

This project runs on Lovable Cloud (managed Supabase) for authentication, database, RLS, and storage.

## Host access model

Host access is determined by real `host_members` records, not by any UI toggle.
When a signed-in user has a `host_members` row with `role = 'host'` for a host,
the navigation surfaces the **Host dashboard** and **Create event** links automatically.

Registering a new host (`/host/register`) creates both:

- a `hosts` row owned by the current user, and
- a matching `host_members` row with `role = 'host'`.

## Demo accounts

> Provided **only for challenge review / demo purposes**.

### Host / Admin demo account

- **Email:** `gatheradmin@example.com`
- **Password:** `GatherAdmin2025!`

After signing in, the app automatically recognizes this user as the Host of
**Open Community Lab** (`/host/open-community-lab`) based on the seeded
`host_members` record. The Host Dashboard and Create Event links appear in
the navigation without any manual role switching.

## Event publishing flow

1. Sign in as the demo Host/Admin (`gatheradmin@example.com`).
2. From the Host dashboard, click **New event**.
3. Fill in basics (title, auto-generated slug, description), date/time and time
   zone, location (in-person or online), capacity, and an optional cover image.
   Pricing shows **Free** (selected) and **Paid** (disabled, with a "Coming
   soon" tooltip). Events stay free for now (`is_paid = false`).
4. Click **Save draft** — the event is created with `status = 'draft'`.
5. On the editor, click **Publish** to set `status = 'published'`.
6. The public event page at `/events/<slug>` is then visible to everyone for
   public events, only via direct link for unlisted events, and only to host
   members while still a draft.
7. From the dashboard or editor, use **Unpublish** to return to draft, or
   **Duplicate** to create a fresh draft copy under the same host.

## Explore

Public visitors can browse events at `/explore` without signing in. The page
shows only events that are `status = 'published'`, `visibility = 'public'`,
and not hidden. Upcoming events are listed by default, sorted by start time.
Filters include text search (title, description, host name), a date range,
location type (online / in person), and an **Include past events** toggle
that reveals ended events with a clear "Ended" badge.

## Attendee flow (RSVP → Ticket)

1. Browse upcoming events on `/explore`.
2. Open an event page.
3. If signed out, click **Sign in to RSVP** — you'll be returned to the same event page after authentication.
4. Click **RSVP** to claim a free spot.
   - If the event has remaining capacity, you receive a confirmed **Going** ticket with a unique ticket code and QR code.
   - If the event is full, you're added to the waitlist with a FIFO position. You'll be promoted automatically when a confirmed attendee cancels.
5. **View ticket** opens `/tickets/$ticketCode` with the QR code and event details. **Add to calendar** downloads an `.ics` file.
6. Manage all tickets at `/tickets`. You can cancel an RSVP any time before the event ends; canceling a confirmed seat promotes the next waitlisted attendee automatically.

Paid events remain disabled (Coming soon). RSVP, cancellation, and waitlist promotion are implemented as atomic Supabase RPC functions (`create_or_update_rsvp`, `cancel_rsvp`).

## Tech stack

- TanStack Start (React 19, Vite 7)
- Tailwind CSS v4 with semantic tokens (`src/styles.css`)
- Lovable Cloud (Supabase) — Auth, Postgres, RLS, Storage

## Host members & invite links

Hosts can grow their team with shareable invite links from
**Host dashboard → Invite members** (`/hosts/:hostId/invites`).

- A Host picks a role (Host or Checker) and clicks **Create link**. A unique
  token is generated and stored in `host_invites`.
- Anyone opening `/invite/:token` while signed out is sent to sign-in and
  returned to the invite page after authentication.
- A signed-in user's accept call goes through the `accept_host_invite` RPC
  (SECURITY DEFINER, authenticated-only) which validates the token, expiry,
  and inserts a `host_members` row. Already-members get a friendly notice.
- Hosts can revoke any unused invite from the same page.

### Roles

- **Host** — full access: dashboard, create/edit/publish/duplicate events,
  invite members, run check-in.
- **Checker** — read-only on My events with **Check-in** quick action only.
  Checkers do **not** see Host Dashboard or Create Event in the navigation,
  and cannot edit, publish, unpublish, or duplicate events.

## My events

`/my-events` aggregates every event across hosts where the current user has a
`host_members` row. Filter by host, date range, or search by title/host name.
Each card shows the user's role badge for that host and exposes only the
actions allowed by that role.

## CSV export

Hosts can export attendee data for any of their events as CSV:

1. Sign in as a Host (or the host owner).
2. Open the **Host Dashboard** or **My Events**.
3. Find the event card for the event you want.
4. Click **Export CSV**.

The downloaded file is named `<event-slug>-rsvps.csv` and contains:

- `name` — attendee full name from their profile
- `email` — attendee email from their profile
- `RSVP status` — `going`, `waitlisted`, or `canceled`
- `check-in time` — local date/time of the active check-in, blank if not checked in (undone check-ins are ignored)

The file is UTF-8 encoded (with BOM) and opens directly in Excel and Google Sheets. Checker-only members do not see the Export CSV action; the underlying `export_event_rsvps` RPC also rejects non-host callers.

## Step 10 — Feedback, gallery, and reports

- After an event ends, attendees can leave a 1–5 rating and optional comment from the public event page.
- Signed-in users can upload photos to an event's gallery; uploads start as pending.
- Hosts review and approve/reject/hide gallery photos from `/dashboard/reviews`.
- Any signed-in user can report an event or an approved photo with a written reason.
- Hosts can hide flagged events or photos from the Review Queue and mark reports reviewed.
- Checkers cannot moderate gallery uploads or reports — these actions are Host-only.
