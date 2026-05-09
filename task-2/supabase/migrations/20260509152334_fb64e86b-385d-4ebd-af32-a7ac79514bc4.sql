
-- Atomic RSVP create-or-revive function with capacity-based assignment
create or replace function public.create_or_update_rsvp(_event_id uuid)
returns public.rsvps
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid := auth.uid();
  _capacity int;
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

  select capacity into _capacity from public.events where id = _event_id for update;
  if _capacity is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;

  select * into _existing from public.rsvps
   where event_id = _event_id and user_id = _user_id
   order by created_at desc
   limit 1;

  -- If user already has an active (non-canceled) RSVP, return it as-is
  if _existing.id is not null and _existing.status <> 'canceled' then
    return _existing;
  end if;

  -- Compute current going count
  select count(*) into _going_count
    from public.rsvps
   where event_id = _event_id and status = 'going';

  if _going_count < _capacity then
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

-- Cancel RSVP and promote next waitlisted FIFO if needed
create or replace function public.cancel_rsvp(_rsvp_id uuid)
returns public.rsvps
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid := auth.uid();
  _rsvp public.rsvps;
  _was_going boolean;
  _next public.rsvps;
  _result public.rsvps;
begin
  if _user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into _rsvp from public.rsvps where id = _rsvp_id for update;
  if _rsvp.id is null then
    raise exception 'RSVP not found' using errcode = 'P0002';
  end if;
  if _rsvp.user_id <> _user_id then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if _rsvp.status = 'canceled' then
    return _rsvp;
  end if;

  _was_going := _rsvp.status = 'going';

  update public.rsvps
     set status = 'canceled',
         canceled_at = now(),
         waitlist_position = null
   where id = _rsvp_id
   returning * into _result;

  if _was_going then
    select * into _next
      from public.rsvps
     where event_id = _rsvp.event_id and status = 'waitlisted'
     order by waitlist_position asc nulls last, created_at asc
     limit 1
     for update;

    if _next.id is not null then
      update public.rsvps
         set status = 'going',
             promoted_at = now(),
             waitlist_position = null
       where id = _next.id;
    end if;
  end if;

  return _result;
end $$;

grant execute on function public.create_or_update_rsvp(uuid) to authenticated;
grant execute on function public.cancel_rsvp(uuid) to authenticated;
