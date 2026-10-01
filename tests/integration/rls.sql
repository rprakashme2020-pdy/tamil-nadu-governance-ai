-- Execute after migrations + seed in a disposable Supabase project, NOT production.
begin;
set local role anon;
select count(*) as visible_verified_schemes from public.schemes;
select count(*) as visible_verified_claims from public.claims;
-- Sensitive tables must return no rows.
do $$ begin
 if exists(select 1 from public.admin_users) then raise exception 'RLS leaked admin_users'; end if;
 if exists(select 1 from public.feedback) then raise exception 'RLS leaked feedback'; end if;
 if exists(select 1 from public.chat_messages) then raise exception 'RLS leaked chat'; end if;
end $$;
-- INSERT must fail for anon.
do $$ begin
 begin
 insert into public.source_domains(domain,organization,trust_level,source_category) values('evil.example','Evil','A','Unknown');
 raise exception 'RLS accepted unauthorized insert';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;
