-- Atomic publication and claim review, callable only by server service role.
create or replace function public.review_claim(claim_id uuid,decision text,reason text,reviewer_id uuid,fields jsonb) returns void language plpgsql security definer set search_path=public,extensions as $$
declare c public.claims; s public.source_domains;
begin
 if not exists(select 1 from admin_users where id=reviewer_id and enabled) then raise exception 'Enabled admin required'; end if;
 if decision not in ('verified','rejected','investigation') or length(reason)<10 then raise exception 'Decision and reason required'; end if;
 select * into c from claims where id=claim_id for update;
 if not found then raise exception 'Claim unavailable'; end if;
 select sd.* into s from source_domains sd join documents d on d.source_domain_id=sd.id where d.id=c.document_id and sd.enabled;
 if not found then raise exception 'Enabled source required'; end if;
 perform set_config('app.change_reason',reason,true);
 if decision='verified' then
  update documents set status='verified',verified_at=now(),source_level=s.trust_level,source_category=s.source_category where id=c.document_id;
 end if;
 update claims set claim_text=fields->>'claim_text',claim_text_ta=fields->>'claim_text_ta',claim_type=fields->>'claim_type',source_page=(fields->>'source_page')::int,reporting_period=fields->>'reporting_period',geographical_scope=fields->>'geographical_scope',population_scope=fields->>'population_scope',metric_name=fields->>'metric_name',metric_value=(fields->>'metric_value')::numeric,unit=fields->>'unit',excerpt=fields->>'excerpt',status=decision,verified_at=case when decision='verified' then now() else null end,verified_by=reviewer_id,embedding=(fields->>'embedding')::extensions.vector,embedding_model=fields->>'embedding_model' where id=claim_id;
 if decision='verified' then
  update schemes set verification_status='verified',last_verified_at=now() where id=c.scheme_id;
 end if;
 insert into verification_records(claim_id,reviewer,decision,reason) values(claim_id,reviewer_id,decision,reason);
end; $$;
revoke all on function public.review_claim(uuid,text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.review_claim(uuid,text,text,uuid,jsonb) to service_role;
