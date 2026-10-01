-- Durable rate limiting without requiring a separate Redis subscription.
create table public.request_limits (
  key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0)
);
alter table public.request_limits enable row level security;
revoke all on public.request_limits from anon, authenticated;

create or replace function public.consume_request_limit(key_hash text)
returns boolean language plpgsql security definer set search_path=public as $$
declare used integer;
begin
  if key_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid rate limit key'; end if;
  delete from request_limits where window_start < now() - interval '1 day';
  insert into request_limits as limits (key_hash, window_start, request_count)
  values (key_hash, now(), 1)
  on conflict on constraint request_limits_pkey do update set
    window_start = case when limits.window_start <= now() - interval '1 minute' then now() else limits.window_start end,
    request_count = case when limits.window_start <= now() - interval '1 minute' then 1 else least(limits.request_count + 1, 21) end
  returning request_count into used;
  return used <= 20;
end; $$;
revoke all on function public.consume_request_limit(text) from public, anon, authenticated;
grant execute on function public.consume_request_limit(text) to service_role;
