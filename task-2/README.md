# Gather

A lightweight event hosting and attendance platform for free community-style
events. Core flow: **Publish → RSVP → Ticket → Check-in**, plus post-event
feedback, a moderated gallery, and a host review queue.

This project runs on Lovable Cloud (managed Supabase) for authentication,
database, RLS, and storage.

## Live demo

- **Live URL:** https://community-event-dash.lovable.app

## Demo accounts

> Provided **only for challenge review / demo purposes**.

- **Host / Admin:** `gatheradmin@example.com` / `GatherAdmin2025!`
- **Attendee 1:** `attendee1@example.com` / `Attendee2025!`
- **Attendee 2:** `attendee2@example.com` / `Attendee2025!`

After signing in as the Host, the app automatically recognizes the user as the
Host of **Open Community Lab** based on the seeded `host_members` row — the
Host Dashboard and Create Event links appear in navigation without any manual
role toggle.

## Main flow — Publish → RSVP → Ticket → Check-in

1. **Publish** — Host creates an event (draft), then clicks **Publish**.
2. **RSVP** — Any signed-in user RSVPs from the public event page. If the
   event is full, they join the FIFO waitlist and are auto-promoted on
   cancellations.
3. **Ticket** — Going RSVPs get a unique ticket code + QR at
   `/tickets/:code` and can add the event to their calendar (`.ics`).
4. **Check-in** — At the door, a Host or Checker enters the ticket code on
   the event check-in page; duplicates are prevented and undo is supported.

## Host flow

1. Sign in, then visit `/host/register` to create a host (name, logo, bio,
   contact email, public host page).
2. From the **Host Dashboard**, click **New event** and fill in title,
   description, start/end date/time, timezone, venue or online link,
   capacity, and cover image. Choose Public/Unlisted and Draft/Published.
3. Use **Publish**, **Unpublish**, or **Duplicate** from the dashboard or
   the event editor.
4. Manage the team via **Invite members** (`/hosts/:hostId/invites`).
   Pick Host or Checker, share the link, revoke unused invites.
5. Run **Check-in** from the event card on the dashboard or My Events.
6. Moderate gallery uploads and reports from `/dashboard/reviews`.

## Attendee flow

1. Browse upcoming events on `/explore` (no sign-in required).
2. Open an event page. If signed out, click **Sign in to RSVP** — you'll be
   returned to the same event page after authentication.
3. Click **RSVP** to claim a free spot.
   - If the event has remaining capacity, you receive a confirmed **Going**
     ticket with a unique ticket code and QR code.
   - If the event is full, you're added to the FIFO waitlist and promoted
     automatically when a confirmed attendee cancels.
4. **View ticket** opens `/tickets/:ticketCode` with the QR code and event
   details. **Add to calendar** downloads an `.ics` file. Manage all your
   tickets at `/tickets`.
5. Cancel any time before the event ends — confirmed cancellations
   auto-promote the next waitlisted user.
6. After the event ends, leave a 1–5 star rating + optional comment, and
   upload photos to the gallery (uploads start as pending).
7. Report an event or approved photo with a written reason.

RSVP, cancellation, and waitlist promotion are implemented as atomic Supabase
RPC functions (`create_or_update_rsvp`, `cancel_rsvp`).

## Checker flow

- Checkers sign in and open `/my-events`. They see only the events of hosts
  where they are members, with the **Check-in** quick action.
- Checkers cannot see the Host Dashboard or Create Event, cannot edit /
  publish / unpublish / duplicate, and cannot moderate gallery or reports.
- Checkers cannot export CSV — the `export_event_rsvps` RPC rejects
  non-host callers server-side as well.

## Explore

Public visitors can browse events at `/explore` without signing in. The page
shows only events that are `status = 'published'`, `visibility = 'public'`,
and not hidden. Upcoming events are listed by default, sorted by start time.
Filters include text search (title, description, host name), a date range,
location type (online / in person), and an **Include past events** toggle
that reveals ended events with a clear "Ended" badge.

## Event publishing flow

1. Sign in as the demo Host/Admin (`gatheradmin@example.com`).
2. From the Host dashboard, click **New event**.
3. Fill in basics (title, auto-generated slug, description), date/time and
   time zone, location (in-person or online), capacity, and an optional cover
   image. Pricing shows **Free** (selected) and **Paid** (disabled, with a
   "Coming soon" tooltip). Events stay free for now (`is_paid = false`).
4. Click **Save draft** — the event is created with `status = 'draft'`.
5. On the editor, click **Publish** to set `status = 'published'`.
6. The public event page at `/events/<slug>` is then visible to everyone for
   public events, only via direct link for unlisted events, and only to host
   members while still a draft.
7. From the dashboard or editor, use **Unpublish** to return to draft, or
   **Duplicate** to create a fresh draft copy under the same host.

## Host access model

Host access is determined by real `host_members` records, not by any UI toggle.
When a signed-in user has a `host_members` row with `role = 'host'` for a host,
the navigation surfaces the **Host dashboard** and **Create event** links
automatically.

Registering a new host (`/host/register`) creates both:

- a `hosts` row owned by the current user, and
- a matching `host_members` row with `role = 'host'`.

### Roles

- **Host** — full access: dashboard, create/edit/publish/duplicate events,
  invite members, run check-in, export CSV, moderate gallery and reports.
- **Checker** — read-only on My events with **Check-in** quick action only.
  Checkers cannot see Host Dashboard or Create Event in the navigation, and
  cannot edit, publish, unpublish, duplicate, export CSV, or moderate.

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
- `check-in time` — local date/time of the active check-in, blank if not
  checked in (undone check-ins are ignored)

The file is UTF-8 encoded (with BOM) and opens directly in Excel and Google
Sheets. Checker-only members do not see the Export CSV action; the underlying
`export_event_rsvps` RPC also rejects non-host callers.

## Feedback, gallery, and reports

- After an event ends, attendees can leave a 1–5 rating and optional comment
  from the public event page.
- Signed-in users can upload photos to an event's gallery; uploads start as
  pending and are not public until approved.
- Hosts review and approve/reject/hide gallery photos from
  `/dashboard/reviews`.
- Any signed-in user can report an event or an approved photo with a written
  reason.
- Hosts can hide flagged events or photos from the Review Queue and mark
  reports reviewed.
- Checkers cannot moderate gallery uploads or reports — these actions are
  Host-only.

## Tech stack

- TanStack Start (React 19, Vite 7)
- Tailwind CSS v4 with semantic tokens (`src/styles.css`)
- Lovable Cloud (Supabase) — Auth, Postgres, RLS, Storage

## MVP limitations

- **Paid events** — UI shows Free/Paid with Paid disabled ("Coming soon").
  No payment integration; `is_paid` is always `false`.
- **Check-in** — manual ticket-code entry only. No camera-based QR scanning.
  The QR encodes the same code attendees can read aloud.
- **Email** — no transactional email worker. Tickets are shown in-app at
  `/tickets/:code` and exportable as `.ics`.
- **Realtime** — counts refresh via `react-query` invalidation rather than
  Postgres changes subscriptions.
- **Password reset** — Supabase magic-link auth is configured, but no
  dedicated `/reset-password` page is shipped in the MVP.
