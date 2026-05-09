
-- ============= ENUMS =============
create type host_role as enum ('host','checker');
create type event_visibility as enum ('public','unlisted');
create type event_status as enum ('draft','published');
create type location_type as enum ('venue','online');
create type rsvp_status as enum ('going','waitlisted','canceled');
create type moderation_status as enum ('pending','approved','rejected');
create type report_target_type as enum ('event','photo');
create type report_status as enum ('open','reviewed','hidden');

-- ============= TABLES =============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.hosts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  logo_url text,
  bio text,
  contact_email text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table public.host_members (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role host_role not null,
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(host_id, user_id)
);

create table public.host_invites (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  role host_role not null,
  token text unique not null,
  expires_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text not null,
  location_type location_type not null,
  venue_address text,
  online_link text,
  capacity int not null check (capacity > 0),
  cover_image_url text,
  visibility event_visibility not null default 'public',
  status event_status not null default 'draft',
  is_paid boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(host_id, slug)
);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status rsvp_status not null,
  ticket_code text unique not null,
  qr_payload text not null,
  waitlist_position int,
  promoted_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  rsvp_id uuid not null references public.rsvps(id) on delete cascade,
  checked_in_by uuid references public.profiles(id),
  checked_in_at timestamptz not null default now(),
  undone_at timestamptz,
  unique(rsvp_id)
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  image_url text not null,
  status moderation_status not null default 'pending',
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references public.profiles(id) on delete set null,
  target_type report_target_type not null,
  target_id uuid not null,
  reason text not null,
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

-- ============ HELPERS ============
create or replace function public.is_host_member(_host_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.host_members where host_id = _host_id and user_id = _user_id)
$$;

create or replace function public.has_host_role(_host_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.host_members where host_id = _host_id and user_id = _user_id and role = 'host')
$$;

create or replace function public.has_checker_or_host_role(_host_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.host_members where host_id = _host_id and user_id = _user_id and role in ('host','checker'))
$$;

create or replace function public.event_host_id(_event_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select host_id from public.events where id = _event_id
$$;

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger events_updated_at before update on public.events
for each row execute function public.tg_set_updated_at();

-- profile auto-create on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  );
  return new;
end $$;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.hosts enable row level security;
alter table public.host_members enable row level security;
alter table public.host_invites enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;
alter table public.check_ins enable row level security;
alter table public.feedback enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.reports enable row level security;

-- profiles
create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);

-- hosts: public read, owner can update; authenticated can create (sets owner = self)
create policy "hosts public read" on public.hosts for select using (true);
create policy "hosts insert by owner" on public.hosts for insert to authenticated with check (owner_user_id = auth.uid());
create policy "hosts update by host role" on public.hosts for update to authenticated
  using (owner_user_id = auth.uid() or public.has_host_role(id, auth.uid()));
create policy "hosts delete by owner" on public.hosts for delete to authenticated using (owner_user_id = auth.uid());

-- host_members
create policy "members read own" on public.host_members for select to authenticated
  using (user_id = auth.uid() or public.is_host_member(host_id, auth.uid()));
create policy "members managed by host" on public.host_members for all to authenticated
  using (public.has_host_role(host_id, auth.uid()))
  with check (public.has_host_role(host_id, auth.uid()));

-- host_invites: only host role
create policy "invites managed by host" on public.host_invites for all to authenticated
  using (public.has_host_role(host_id, auth.uid()))
  with check (public.has_host_role(host_id, auth.uid()));

-- events
create policy "events public read published" on public.events for select
  using ((status = 'published' and hidden = false) or public.is_host_member(host_id, auth.uid()));
create policy "events insert by host role" on public.events for insert to authenticated
  with check (public.has_host_role(host_id, auth.uid()));
create policy "events update by host role" on public.events for update to authenticated
  using (public.has_host_role(host_id, auth.uid()))
  with check (public.has_host_role(host_id, auth.uid()));
create policy "events delete by host role" on public.events for delete to authenticated
  using (public.has_host_role(host_id, auth.uid()));

-- rsvps
create policy "rsvps read own or host members" on public.rsvps for select to authenticated
  using (user_id = auth.uid() or public.is_host_member(public.event_host_id(event_id), auth.uid()));
create policy "rsvps insert own" on public.rsvps for insert to authenticated with check (user_id = auth.uid());
create policy "rsvps update own" on public.rsvps for update to authenticated using (user_id = auth.uid());
create policy "rsvps delete own" on public.rsvps for delete to authenticated using (user_id = auth.uid());

-- check_ins: host or checker for event's host
create policy "check_ins read by host members" on public.check_ins for select to authenticated
  using (public.is_host_member(public.event_host_id(event_id), auth.uid()));
create policy "check_ins insert by checker/host" on public.check_ins for insert to authenticated
  with check (public.has_checker_or_host_role(public.event_host_id(event_id), auth.uid()));
create policy "check_ins update by checker/host" on public.check_ins for update to authenticated
  using (public.has_checker_or_host_role(public.event_host_id(event_id), auth.uid()));

-- feedback
create policy "feedback read own or host" on public.feedback for select to authenticated
  using (user_id = auth.uid() or public.is_host_member(public.event_host_id(event_id), auth.uid()));
create policy "feedback insert own" on public.feedback for insert to authenticated with check (user_id = auth.uid());
create policy "feedback update own" on public.feedback for update to authenticated using (user_id = auth.uid());

-- gallery_photos
create policy "gallery public read approved" on public.gallery_photos for select
  using ((status = 'approved' and hidden = false)
    or uploaded_by = auth.uid()
    or public.is_host_member(public.event_host_id(event_id), auth.uid()));
create policy "gallery insert authenticated" on public.gallery_photos for insert to authenticated
  with check (uploaded_by = auth.uid());
create policy "gallery host moderate" on public.gallery_photos for update to authenticated
  using (public.is_host_member(public.event_host_id(event_id), auth.uid()))
  with check (public.is_host_member(public.event_host_id(event_id), auth.uid()));
create policy "gallery uploader delete" on public.gallery_photos for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_host_member(public.event_host_id(event_id), auth.uid()));

-- reports
create policy "reports insert authenticated" on public.reports for insert to authenticated
  with check (reporter_user_id = auth.uid());
create policy "reports read own" on public.reports for select to authenticated
  using (reporter_user_id = auth.uid());
create policy "reports host review event" on public.reports for select to authenticated
  using (
    target_type = 'event' and public.is_host_member(public.event_host_id(target_id), auth.uid())
  );
create policy "reports host update event" on public.reports for update to authenticated
  using (
    target_type = 'event' and public.is_host_member(public.event_host_id(target_id), auth.uid())
  );

-- ============ STORAGE BUCKETS ============
insert into storage.buckets (id, name, public) values
  ('host-logos','host-logos',true),
  ('cover-images','cover-images',true),
  ('gallery-photos','gallery-photos',true)
on conflict (id) do nothing;

-- storage policies
create policy "host-logos public read" on storage.objects for select using (bucket_id = 'host-logos');
create policy "host-logos auth upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'host-logos' and owner = auth.uid());
create policy "host-logos owner update" on storage.objects for update to authenticated
  using (bucket_id = 'host-logos' and owner = auth.uid());
create policy "host-logos owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'host-logos' and owner = auth.uid());

create policy "cover-images public read" on storage.objects for select using (bucket_id = 'cover-images');
create policy "cover-images auth upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'cover-images' and owner = auth.uid());
create policy "cover-images owner update" on storage.objects for update to authenticated
  using (bucket_id = 'cover-images' and owner = auth.uid());
create policy "cover-images owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'cover-images' and owner = auth.uid());

create policy "gallery-photos public read" on storage.objects for select using (bucket_id = 'gallery-photos');
create policy "gallery-photos auth upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery-photos' and owner = auth.uid());
create policy "gallery-photos owner update" on storage.objects for update to authenticated
  using (bucket_id = 'gallery-photos' and owner = auth.uid());
create policy "gallery-photos owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'gallery-photos' and owner = auth.uid());
