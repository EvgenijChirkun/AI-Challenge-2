# Task 2 Report

## Overview

Task 2 was implemented as a lightweight event hosting and attendance platform for free community-style events.

The main product flow is:

**Publish → RSVP → Ticket → Check-in**

The deployed application allows Hosts to create and publish events, attendees to RSVP and receive tickets, and Hosts or Checkers to manually check attendees in at the venue.

Live demo: https://community-event-dash.lovable.app

## Tools and Techniques Used

The application was built with:

- Lovable for rapid app generation, UI iteration, deployment, and Supabase integration
- Supabase Auth for email/password authentication
- Supabase PostgreSQL for relational data storage
- Supabase Row Level Security for access control
- Supabase Storage for host logos, event cover images, and gallery photos
- Supabase RPC functions for sensitive workflows
- TanStack Start with React and Vite
- Tailwind CSS for styling
- QR code generation for attendee tickets
- CSV export compatible with Excel and Google Sheets

## What Worked

Lovable worked well for generating the application shell, page structure, forms, and role-aware UI quickly.

Supabase was a good fit because the task required authentication, relational data, file storage, and permissions. Using PostgreSQL tables with RLS and RPC functions made it possible to keep important operations protected on the backend.

The following flows were implemented successfully:

- Host registration and public Host pages
- Event creation, editing, publishing, unpublishing, and duplication
- Explore page with search, date, location, and past-event filters
- RSVP with sign-in redirect and return-to-event behavior
- Capacity enforcement and FIFO waitlist
- Ticket generation with unique ticket code and QR code
- Add to Calendar `.ics` download
- RSVP cancellation and automatic waitlist promotion
- My Tickets page
- Host and Checker roles
- Invite links for Host and Checker roles
- My Events page with role-aware quick actions
- Manual check-in with duplicate prevention and undo
- Host dashboard with Going, Waitlist, and Checked-in counts
- CSV export for RSVP and attendance data
- Post-event feedback
- Gallery uploads with Host approval
- Event/photo reporting and Host review queue

## What Did Not Work

The main challenge was keeping the role model close to a real production system while still moving quickly.

Early iterations used temporary UI assumptions for role switching. This was replaced with real role checks based on the `host_members` table.

The check-in flow also required cleanup because an obsolete mock check-in route existed during development. It was removed so that check-in is available only through the protected event check-in route.

Some features were intentionally not implemented because they were outside the required MVP scope:

- Paid events
- Camera-based QR scanning
- Transactional ticket emails
- Dedicated password reset page
- Full realtime dashboard counters

## Notable Decisions

### Supabase as Backend

Supabase was selected because it provides authentication, PostgreSQL, storage, and Row Level Security in one platform. This matched the task requirements while keeping the implementation lightweight.

### Host and Checker Roles

Host and Checker permissions are based on real `host_members` records.

Host users can:

- manage events
- invite members
- export CSVs
- approve gallery uploads
- review reports
- access check-in

Checker users can:

- access check-in pages for assigned Host events

Checker users cannot:

- create or edit events
- publish or unpublish events
- duplicate events
- export CSV files
- moderate gallery uploads or reports

### RSVP and Waitlist

RSVP, cancellation, and waitlist promotion are implemented with Supabase RPC functions instead of only client-side logic.

This keeps capacity enforcement and waitlist promotion close to the database and reduces the risk of inconsistent state.

Key RPC-backed flows include:

- `create_or_update_rsvp`
- `cancel_rsvp`

The RSVP logic prevents duplicate active RSVPs, enforces capacity, assigns waitlist positions, and promotes the next waitlisted attendee when a confirmed attendee cancels.

### Check-in

Camera QR scanning was not implemented because the task explicitly allowed manual ticket-code entry.

Tickets still include a QR code, but the same ticket code can be entered manually on the check-in page.

Check-in supports:

- manual ticket code entry
- ticket validation
- duplicate check-in prevention
- live counters
- undo last scan

### CSV Export

CSV export uses the exact required schema:

```csv
name,email,RSVP status,check-in time
```

The generated CSV uses UTF-8 with BOM and proper escaping so it opens correctly in Excel and Google Sheets.

CSV export is available only to Host users. Checker users do not see the export action, and the backend RPC rejects non-Host callers.

## Supabase and Access Control

Authentication uses Supabase email/password login.

Access control is handled with:

- Supabase Auth session state
- `profiles`
- `hosts`
- `host_members`
- Row Level Security policies
- Security-definer RPC functions with explicit `auth.uid()` and role checks

Sensitive operations are protected server-side, including:

- RSVP creation
- RSVP cancellation
- waitlist promotion
- invite acceptance
- check-in
- undo check-in
- feedback submission
- CSV export
- report review

No service role key is exposed in frontend code.

## Demo Accounts

The deployed app includes demo accounts for challenge review.

Host/Admin:

- Email: `gatheradmin@example.com`
- Password: `GatherAdmin2025!`

Attendees:

- `attendee1@example.com` / `Attendee2025!`
- `attendee2@example.com` / `Attendee2025!`

These accounts are provided only for challenge review and demo purposes.

## Seeded Demo Data

The deployed application includes synthetic seeded data:

- Host: Open Community Lab
- One upcoming event
- One past event
- At least one confirmed RSVP
- At least one waitlisted RSVP
- At least one checked-in attendee
- At least one pending gallery photo
- At least one open report

No real corporate or personal data is included.

## Deployment

The app is deployed with Lovable.

Live demo:

https://community-event-dash.lovable.app

The source code and required artifacts are stored under `task-2/` in the challenge repository.

Required artifacts:

- `task-2/README.md`
- `task-2/report.md`
- `task-2/artifacts/sample-rsvp-export.csv`

## MVP Limitations

The following limitations are intentional:

- Paid events are disabled with a "Coming soon" tooltip.
- Camera-based QR scanning is not implemented; manual ticket-code entry is supported.
- No transactional ticket emails are sent; tickets are shown in-app.
- Dashboard counters refresh through query invalidation rather than full realtime subscriptions.
- No dedicated reset-password page is included in the MVP.
