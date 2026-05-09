create or replace function public.accept_host_invite(_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid := auth.uid();
  _invite public.host_invites;
  _existing public.host_members;
  _new public.host_members;
begin
  if _user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into _invite from public.host_invites where token = _token;
  if _invite.id is null then
    return jsonb_build_object('state', 'invalid', 'message', 'Invite not found');
  end if;
  if _invite.expires_at is not null and _invite.expires_at <= now() then
    return jsonb_build_object('state', 'expired', 'message', 'Invite has expired');
  end if;

  select * into _existing from public.host_members
   where host_id = _invite.host_id and user_id = _user_id
   limit 1;

  if _existing.id is not null then
    return jsonb_build_object(
      'state', 'already_member',
      'host_id', _invite.host_id,
      'role', _existing.role
    );
  end if;

  insert into public.host_members (host_id, user_id, role, invited_by)
  values (_invite.host_id, _user_id, _invite.role, _invite.created_by)
  returning * into _new;

  return jsonb_build_object(
    'state', 'accepted',
    'host_id', _new.host_id,
    'role', _new.role
  );
end $$;

revoke execute on function public.accept_host_invite(text) from public, anon;
grant execute on function public.accept_host_invite(text) to authenticated;