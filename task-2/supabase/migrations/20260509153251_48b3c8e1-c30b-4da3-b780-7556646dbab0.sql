
create or replace function public.create_or_update_rsvp(_event_id uuid)
returns public.rsvps
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid := auth.uid();
  _event public.events;
  _going_count int;
  _next_pos int;
  _existing public.rsvps;
  _result public.rsvps;
  _new_status rsvp_status;
  _ticket_code text;
  _qr text;
  _waitlist_pos int;
begin
  if _user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into _event from public.events where id = _event_id for update;
  if _event.id is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if _event.status <> 'published' or _event.hidden then
    raise exception 'Event is not open for RSVP' using errcode = '22023';
  end if;
  if _event.end_at <= now() then
    raise exception 'Event has already ended' using errcode = '22023';
  end if;

  select * into _existing from public.rsvps
   where event_id = _event_id and user_id = _user_id
   order by created_at desc
   limit 1;

  if _existing.id is not null and _existing.status <> 'canceled' then
    return _existing;
  end if;

  select count(*) into _going_count
    from public.rsvps
   where event_id = _event_id and status = 'going';

  if _going_count < _event.capacity then
    _new_status := 'going';
    _waitlist_pos := null;
  else
    _new_status := 'waitlisted';
    select coalesce(max(waitlist_position), 0) + 1 into _next_pos
      from public.rsvps where event_id = _event_id and status = 'waitlisted';
    _waitlist_pos := _next_pos;
  end if;

  _ticket_code := 'GTHR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)) ||
                  '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  _qr := _ticket_code;

  if _existing.id is not null then
    update public.rsvps
       set status = _new_status,
           waitlist_position = _waitlist_pos,
           ticket_code = _ticket_code,
           qr_payload = _qr,
           canceled_at = null,
           promoted_at = null,
           created_at = now()
     where id = _existing.id
     returning * into _result;
  else
    insert into public.rsvps (event_id, user_id, status, ticket_code, qr_payload, waitlist_position)
    values (_event_id, _user_id, _new_status, _ticket_code, _qr, _waitlist_pos)
    returning * into _result;
  end if;

  return _result;
end $$;

-- Tighten exposure: only authenticated users can call these.
revoke execute on function public.create_or_update_rsvp(uuid) from public, anon;
revoke execute on function public.cancel_rsvp(uuid) from public, anon;
grant execute on function public.create_or_update_rsvp(uuid) to authenticated;
grant execute on function public.cancel_rsvp(uuid) to authenticated;
