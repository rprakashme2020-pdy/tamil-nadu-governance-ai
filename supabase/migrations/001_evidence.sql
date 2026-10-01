-- Governance evidence schema. Run as the Supabase migration owner.
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto;
create table public.admin_users(id uuid primary key references auth.users(id) on delete cascade, enabled boolean not null default true, created_at timestamptz not null default now());
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.admin_users where id=auth.uid() and enabled); $$;
create table public.departments(id uuid primary key default gen_random_uuid(), name_en text not null, name_ta text not null, created_at timestamptz default now());
create table public.categories(id uuid primary key default gen_random_uuid(), name_en text not null, name_ta text not null);
create table public.districts(id uuid primary key default gen_random_uuid(), name_en text not null, name_ta text not null);
create table public.source_domains(id uuid primary key default gen_random_uuid(), domain text unique not null check(domain !~ '[/:]'), organization text not null, trust_level text not null check(trust_level in ('A','B','C','D')), source_category text not null, enabled boolean not null default true, notes text, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.schemes(id uuid primary key default gen_random_uuid(), name_en text not null, name_ta text not null, slug text unique not null, short_description_en text not null, short_description_ta text not null, department text not null, department_id uuid references public.departments, category text not null, category_id uuid references public.categories, launch_date date, status text not null default 'draft', target_population text, objectives jsonb default '[]', eligibility jsonb default '[]', benefits jsonb default '[]', application_process jsonb default '[]', official_url text, start_year int check(start_year between 2021 and 2026), end_year int, budget_information jsonb default '[]', beneficiary_information jsonb default '[]', geographical_coverage text, last_verified_at timestamptz, verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected','archived')), created_at timestamptz default now(), updated_at timestamptz default now());
create table public.scheme_districts(scheme_id uuid references public.schemes on delete cascade, district_id uuid references public.districts on delete cascade, primary key(scheme_id,district_id));
create table public.documents(id uuid primary key default gen_random_uuid(), title text not null, organization text not null, publication_date date, document_type text not null, source_level text not null check(source_level in ('A','B','C','D')), source_category text not null, original_url text, source_domain_id uuid not null references public.source_domains, storage_path text, extracted_text text, content_sha256 text, status text not null default 'pending' check(status in ('pending','verified','rejected','archived')), verified_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.document_chunks(id uuid primary key default gen_random_uuid(), document_id uuid not null references public.documents on delete cascade, page int, chunk_index int not null, content text not null, embedding extensions.vector(1536), embedding_model text, created_at timestamptz default now(), unique(document_id,chunk_index));
create table public.claims(id uuid primary key default gen_random_uuid(), scheme_id uuid not null references public.schemes, claim_text text not null, claim_text_ta text not null default '', claim_type text not null, status text not null default 'pending' check(status in ('pending','verified','rejected','investigation','archived')), document_id uuid not null references public.documents, source_page int check(source_page>0), excerpt text not null, reporting_period text not null default '', geographical_scope text not null default '', population_scope text not null default '', metric_name text, metric_value numeric, unit text, verified_at timestamptz, verified_by uuid references public.admin_users, version int not null default 1, embedding extensions.vector(1536), embedding_model text, search_vector tsvector generated always as(to_tsvector('simple',coalesce(claim_text,'')||' '||coalesce(claim_text_ta,''))) stored, created_at timestamptz default now(), updated_at timestamptz default now(), check(metric_value is null or (metric_name is not null and unit is not null)));
create table public.claim_sources(claim_id uuid references public.claims, document_id uuid references public.documents, page int, excerpt text not null, primary key(claim_id,document_id));
create table public.claim_versions(id uuid primary key default gen_random_uuid(), claim_id uuid not null references public.claims, previous_record jsonb not null, new_record jsonb not null, reason text not null, editor uuid references public.admin_users, changed_at timestamptz default now());
create table public.statistics(id uuid primary key default gen_random_uuid(), claim_id uuid unique not null references public.claims, scheme_id uuid not null references public.schemes, metric_name text not null, metric_value numeric not null, unit text not null, reporting_period text not null, geographical_scope text not null, population_scope text not null, source_document_id uuid not null references public.documents, source_page int, verification_status text not null default 'pending', created_at timestamptz default now());
create table public.budgets(id uuid primary key default gen_random_uuid(), statistic_id uuid not null references public.statistics, measure text not null check(measure in ('allocated','spent','sanctioned')), financial_year text not null);
create table public.beneficiaries(id uuid primary key default gen_random_uuid(), statistic_id uuid not null references public.statistics, measure text not null check(measure in ('registered','applications','benefited')));
create table public.outcomes(id uuid primary key default gen_random_uuid(), statistic_id uuid not null references public.statistics, measure text not null check(measure in ('trained','employed','placement_support','targeted','achieved','announced','implemented','started','completed','sanctioned')));
create table public.timeline_events(id uuid primary key default gen_random_uuid(), scheme_id uuid not null references public.schemes, claim_id uuid not null references public.claims, event_date date not null, title_en text not null, title_ta text not null, event_type text not null);
create table public.citations(id uuid primary key default gen_random_uuid(), claim_id uuid not null references public.claims, document_id uuid not null references public.documents, page int, excerpt text not null);
create table public.verification_records(id uuid primary key default gen_random_uuid(), claim_id uuid not null references public.claims, reviewer uuid not null references public.admin_users, decision text not null, reason text not null, verified_at timestamptz default now());
create table public.chat_sessions(id uuid primary key default gen_random_uuid(), created_at timestamptz default now(), expires_at timestamptz default now()+interval '30 days');
create table public.chat_messages(id uuid primary key default gen_random_uuid(), session_id uuid not null references public.chat_sessions on delete cascade, role text not null check(role in ('user','assistant')), content jsonb not null, created_at timestamptz default now());
create table public.answer_snapshots(id uuid primary key, snapshot jsonb not null, created_at timestamptz default now());
create table public.feedback(id uuid primary key default gen_random_uuid(), answer_id uuid not null, question text not null, reason text not null, notes text not null default '', resolved boolean default false, created_at timestamptz default now());
create table public.audit_logs(id uuid primary key default gen_random_uuid(), actor uuid, action text not null, table_name text not null, record_id uuid, before_record jsonb, after_record jsonb, created_at timestamptz default now());
create index claims_fts_idx on public.claims using gin(search_vector);
create index claims_embedding_idx on public.claims using hnsw(embedding extensions.vector_cosine_ops);
create index chunks_embedding_idx on public.document_chunks using hnsw(embedding extensions.vector_cosine_ops);
create index claims_filter_idx on public.claims(status,scheme_id,claim_type,reporting_period);
create index statistics_period_idx on public.statistics(scheme_id,metric_name,reporting_period);
create or replace function public.check_verified_claim() returns trigger language plpgsql set search_path=public as $$
begin
 if new.status='verified' then
  if not exists(select 1 from documents d join source_domains s on s.id=d.source_domain_id where d.id=new.document_id and d.status='verified' and s.enabled) then raise exception 'Verified enabled source document required'; end if;
  if length(trim(new.excerpt))=0 or length(trim(new.claim_text_ta))=0 or new.verified_at is null then raise exception 'Excerpt, translation and verification date required'; end if;
  if new.metric_value is not null and (new.source_page is null or length(trim(new.reporting_period))=0 or length(trim(new.geographical_scope))=0 or length(trim(new.population_scope))=0) then raise exception 'Quantitative claims require page, period and scopes'; end if;
 end if; return new;
end; $$;
create trigger claim_verify_guard before insert or update on public.claims for each row execute function public.check_verified_claim();
create or replace function public.audit_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into audit_logs(actor,action,table_name,record_id,before_record,after_record) values(auth.uid(),tg_op,tg_table_name,coalesce(new.id,old.id),case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end);
 if tg_op='DELETE' then return old; end if; return new;
end; $$;
create or replace function public.version_claim() returns trigger language plpgsql security definer set search_path=public as $$
begin
 new.version=old.version+1; new.updated_at=now();
 insert into claim_versions(claim_id,previous_record,new_record,reason,editor) values(old.id,to_jsonb(old),to_jsonb(new),coalesce(current_setting('app.change_reason',true),'Reviewed administrative change'),new.verified_by);
 return new;
end; $$;
create trigger claim_history before update on public.claims for each row execute function public.version_claim();
create or replace function public.hybrid_claim_search(query_text text,query_embedding extensions.vector(1536) default null,match_count int default 30) returns table(id uuid,score double precision) language sql stable set search_path=public,extensions as $$
 select c.id,(ts_rank_cd(c.search_vector,to_tsquery('simple',query_text))::double precision + case when query_embedding is not null and c.embedding is not null and 1-(c.embedding <=> query_embedding)>0.72 then (1-(c.embedding <=> query_embedding)) else 0 end) as score
 from claims c join documents d on d.id=c.document_id join source_domains s on s.id=d.source_domain_id join schemes sc on sc.id=c.scheme_id
 where c.status='verified' and d.status='verified' and s.enabled and sc.verification_status='verified' and ((c.search_vector || to_tsvector('simple',sc.name_en||' '||sc.name_ta)) @@ to_tsquery('simple',query_text) or (query_embedding is not null and c.embedding is not null and 1-(c.embedding <=> query_embedding)>0.72))
 order by score desc limit least(greatest(match_count,1),50);
$$;
alter table public.admin_users enable row level security;
create policy admin_all on public.admin_users for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.departments enable row level security;
create policy admin_all on public.departments for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.categories enable row level security;
create policy admin_all on public.categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.districts enable row level security;
create policy admin_all on public.districts for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.source_domains enable row level security;
create policy admin_all on public.source_domains for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.schemes enable row level security;
create policy admin_all on public.schemes for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.scheme_districts enable row level security;
create policy admin_all on public.scheme_districts for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.documents enable row level security;
create policy admin_all on public.documents for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.document_chunks enable row level security;
create policy admin_all on public.document_chunks for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.claims enable row level security;
create policy admin_all on public.claims for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.claim_sources enable row level security;
create policy admin_all on public.claim_sources for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.claim_versions enable row level security;
create policy admin_read on public.claim_versions for select to authenticated using(public.is_admin());
alter table public.statistics enable row level security;
create policy admin_all on public.statistics for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.budgets enable row level security;
create policy admin_all on public.budgets for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.beneficiaries enable row level security;
create policy admin_all on public.beneficiaries for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.outcomes enable row level security;
create policy admin_all on public.outcomes for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.timeline_events enable row level security;
create policy admin_all on public.timeline_events for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.citations enable row level security;
create policy admin_all on public.citations for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.verification_records enable row level security;
create policy admin_all on public.verification_records for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.chat_sessions enable row level security;
create policy admin_all on public.chat_sessions for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.chat_messages enable row level security;
create policy admin_all on public.chat_messages for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.answer_snapshots enable row level security;
create policy admin_all on public.answer_snapshots for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.feedback enable row level security;
create policy admin_all on public.feedback for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.audit_logs enable row level security;
create policy admin_read on public.audit_logs for select to authenticated using(public.is_admin());
create policy public_verified on public.schemes for select to anon,authenticated using(verification_status='verified');
create policy public_verified on public.documents for select to anon,authenticated using(status='verified' and exists(select 1 from source_domains s where s.id=source_domain_id and s.enabled));
create policy public_verified on public.claims for select to anon,authenticated using(status='verified' and exists(select 1 from documents d where d.id=document_id and d.status='verified'));
create policy public_verified on public.source_domains for select to anon,authenticated using(enabled);
create policy public_verified on public.departments for select to anon,authenticated using(true);
create policy public_verified on public.categories for select to anon,authenticated using(true);
create policy public_verified on public.districts for select to anon,authenticated using(true);
create policy public_verified on public.statistics for select to anon,authenticated using(verification_status='verified' and exists(select 1 from claims c where c.id=claim_id and c.status='verified'));
create policy public_verified on public.timeline_events for select to anon,authenticated using(exists(select 1 from claims c where c.id=claim_id and c.status='verified'));
create trigger audit_schemes after insert or update or delete on public.schemes for each row execute function public.audit_change();
create trigger audit_documents after insert or update or delete on public.documents for each row execute function public.audit_change();
create trigger audit_claims after insert or update or delete on public.claims for each row execute function public.audit_change();
create trigger audit_source_domains after insert or update or delete on public.source_domains for each row execute function public.audit_change();
create trigger audit_statistics after insert or update or delete on public.statistics for each row execute function public.audit_change();

-- Public APIs do not expose extracted raw documents, embeddings, private chat or feedback.
revoke all on public.documents from anon;
grant select(id,title,organization,publication_date,document_type,source_level,source_category,original_url,source_domain_id,status,verified_at,created_at,updated_at) on public.documents to anon;
revoke all on public.claims from anon;
grant select(id,scheme_id,claim_text,claim_text_ta,claim_type,status,document_id,source_page,excerpt,reporting_period,geographical_scope,population_scope,metric_name,metric_value,unit,verified_at,version,created_at,updated_at) on public.claims to anon;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('evidence','evidence',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']) on conflict(id) do nothing;
create policy evidence_admin on storage.objects for all to authenticated using(bucket_id='evidence' and public.is_admin()) with check(bucket_id='evidence' and public.is_admin());

-- Whitelist editor notes remain private to administrators.
revoke all on public.source_domains from anon;
grant select(id,domain,organization,trust_level,source_category,enabled,created_at,updated_at) on public.source_domains to anon;
