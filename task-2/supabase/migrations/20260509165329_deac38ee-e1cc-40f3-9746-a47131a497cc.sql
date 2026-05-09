
-- 1) helper: photo -> event_id
create or replace function public.photo_event_id(_photo_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select event_id from public.gallery_photos where id = _photo_id
$$;

-- 2) reports: allow host members of the photo's event to read/update photo reports
drop policy if exists "reports host review photo" on public.reports;
create policy "reports host review photo"
  on public.reports for select
  to authenticated
  using (
    target_type = 'photo'::report_target_type
    and is_host_member(public.event_host_id(public.photo_event_id(target_id)), auth.uid())
  );

drop policy if exists "reports host update photo" on public.reports;
create policy "reports host update photo"
  on public.reports for update
  to authenticated
  using (
    target_type = 'photo'::report_target_type
    and is_host_member(public.event_host_id(public.photo_event_id(target_id)), auth.uid())
  );

-- 3) public feedback summary (RLS bypass via security definer; only published, non-hidden events)
create or replace function public.get_event_feedback_summary(_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _avg numeric;
  _count int;
  _recent jsonb;
  _ev public.events;
begin
  select * into _ev from public.events where id = _event_id;
  if _ev.id is null then
    return jsonb_build_object('average', null, 'count', 0, 'recent', '[]'::jsonb);
  end if;
  if _ev.status <> 'published' or _ev.hidden then
    -- only allow host members to see non-public summaries
    if not public.is_host_member(_ev.host_id, auth.uid()) then
      return jsonb_build_object('average', null, 'count', 0, 'recent', '[]'::jsonb);
    end if;
  end if;

  select round(avg(rating)::numeric, 2), count(*) into _avg, _count
    from public.feedback where event_id = _event_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'rating', rating,
    'comment', comment,
    'created_at', created_at
  ) order by created_at desc), '[]'::jsonb) into _recent
  from (
    select rating, comment, created_at
      from public.feedback
     where event_id = _event_id and comment is not null and length(btrim(comment)) > 0
     order by created_at desc
     limit 5
  ) t;

  return jsonb_build_object('average', _avg, 'count', coalesce(_count, 0), 'recent', _recent);
end $$;

grant execute on function public.get_event_feedback_summary(uuid) to anon, authenticated;

-- 4) feedback submission with server-side validation
create or replace function public.submit_event_feedback(_event_id uuid, _rating int, _comment text)
returns public.feedback
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid := auth.uid();
  _ev public.events;
  _has_rsvp boolean;
  _existing public.feedback;
  _result public.feedback;
begin
  if _user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if _rating is null or _rating < 1 or _rating > 5 then
    raise exception 'Rating must be between 1 and 5' using errcode = '22023';
  end if;

  select * into _ev from public.events where id = _event_id;
  if _ev.id is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if _ev.end_at > now() then
    raise exception 'Feedback is available after the event ends' using errcode = '22023';
  end if;

  select exists(
    select 1 from public.rsvps
     where event_id = _event_id and user_id = _user_id and status <> 'canceled'
  ) into _has_rsvp;

  if not _has_rsvp then
    raise exception 'Only attendees can leave feedback' using errcode = '42501';
  end if;

  select * into _existing from public.feedback
   where event_id = _event_id and user_id = _user_id;
  if _existing.id is not null then
    raise exception 'You already submitted feedback for this event' using errcode = '23505';
  end if;

  insert into public.feedback (event_id, user_id, rating, comment)
  values (_event_id, _user_id, _rating, nullif(btrim(coalesce(_comment, '')), ''))
  returning * into _result;

  return _result;
end $$;

grant execute on function public.submit_event_feedback(uuid, int, text) to authenticated;

-- 5) review report (host only)
create or replace function public.review_report(_report_id uuid, _new_status text)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid := auth.uid();
  _r public.reports;
  _host_id uuid;
  _result public.reports;
begin
  if _user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if _new_status not in ('reviewed','hidden','open') then
    raise exception 'Invalid status' using errcode = '22023';
  end if;

  select * into _r from public.reports where id = _report_id;
  if _r.id is null then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;

  if _r.target_type = 'event' then
    _host_id := public.event_host_id(_r.target_id);
  else
    _host_id := public.event_host_id(public.photo_event_id(_r.target_id));
  end if;

  if _host_id is null or not public.has_host_role(_host_id, _user_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  update public.reports
     set status = _new_status::report_status,
         reviewed_at = case when _new_status = 'open' then null else now() end,
         reviewed_by = case when _new_status = 'open' then null else _user_id end
   where id = _report_id
   returning * into _result;

  return _result;
end $$;

grant execute on function public.review_report(uuid, text) to authenticated;
