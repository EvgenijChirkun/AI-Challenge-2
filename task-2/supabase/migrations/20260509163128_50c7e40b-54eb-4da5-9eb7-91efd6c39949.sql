create or replace function public.export_event_rsvps(_event_id uuid)
returns table(name text, email text, rsvp_status text, check_in_time timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _user_id uuid := auth.uid();
  _host_id uuid;
begin
  if _user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select host_id into _host_id from public.events where id = _event_id;
  if _host_id is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;

  if not public.has_host_role(_host_id, _user_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
    select
      coalesce(p.full_name, '')::text as name,
      coalesce(p.email, '')::text as email,
      r.status::text as rsvp_status,
      ci.checked_in_at as check_in_time
    from public.rsvps r
    left join public.profiles p on p.id = r.user_id
    left join lateral (
      select checked_in_at
        from public.check_ins
       where rsvp_id = r.id and undone_at is null
       order by checked_in_at desc
       limit 1
    ) ci on true
    where r.event_id = _event_id
    order by r.created_at asc;
end $$;

revoke all on function public.export_event_rsvps(uuid) from public, anon;
grant execute on function public.export_event_rsvps(uuid) to authenticated;