create or replace function public.check_in_ticket(_event_id uuid, _ticket_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid := auth.uid();
  _event public.events;
  _rsvp public.rsvps;
  _existing public.check_ins;
  _new public.check_ins;
  _code text;
begin
  if _user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into _event from public.events where id = _event_id;
  if _event.id is null then
    return jsonb_build_object('state', 'invalid', 'message', 'Event not found');
  end if;

  if not public.has_checker_or_host_role(_event.host_id, _user_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  _code := upper(btrim(coalesce(_ticket_code, '')));
  if _code = '' then
    return jsonb_build_object('state', 'invalid', 'message', 'Empty ticket code');
  end if;

  select * into _rsvp from public.rsvps
   where upper(ticket_code) = _code
   order by created_at desc
   limit 1;

  if _rsvp.id is null then
    return jsonb_build_object('state', 'invalid', 'message', 'Ticket not found');
  end if;

  if _rsvp.event_id <> _event_id then
    return jsonb_build_object('state', 'wrong_event', 'message', 'Ticket is for a different event');
  end if;

  if _rsvp.status <> 'going' then
    return jsonb_build_object('state', 'not_confirmed', 'message', 'Ticket is not confirmed (status: ' || _rsvp.status || ')');
  end if;

  select * into _existing from public.check_ins
   where rsvp_id = _rsvp.id and undone_at is null
   limit 1;

  if _existing.id is not null then
    return jsonb_build_object(
      'state', 'duplicate',
      'message', 'Already checked in',
      'check_in_id', _existing.id,
      'rsvp_id', _rsvp.id,
      'ticket_code', _rsvp.ticket_code
    );
  end if;

  insert into public.check_ins (event_id, rsvp_id, checked_in_by)
  values (_event_id, _rsvp.id, _user_id)
  returning * into _new;

  return jsonb_build_object(
    'state', 'success',
    'check_in_id', _new.id,
    'rsvp_id', _rsvp.id,
    'user_id', _rsvp.user_id,
    'ticket_code', _rsvp.ticket_code,
    'checked_in_at', _new.checked_in_at
  );
end $$;

revoke execute on function public.check_in_ticket(uuid, text) from public, anon;
grant execute on function public.check_in_ticket(uuid, text) to authenticated;

create or replace function public.undo_check_in(_check_in_id uuid)
returns public.check_ins
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid := auth.uid();
  _ci public.check_ins;
  _result public.check_ins;
begin
  if _user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into _ci from public.check_ins where id = _check_in_id;
  if _ci.id is null then
    raise exception 'Check-in not found' using errcode = 'P0002';
  end if;

  if not public.has_checker_or_host_role(public.event_host_id(_ci.event_id), _user_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  update public.check_ins
     set undone_at = now()
   where id = _check_in_id and undone_at is null
   returning * into _result;

  if _result.id is null then
    return _ci;
  end if;
  return _result;
end $$;

revoke execute on function public.undo_check_in(uuid) from public, anon;
grant execute on function public.undo_check_in(uuid) to authenticated;