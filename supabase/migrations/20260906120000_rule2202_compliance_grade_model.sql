-- Rule 2202 compliance-grade evidence, calculation, approval, and retention model.
-- This migration extends the existing tenant-scoped persistence layer.

alter table public.rule2202_employee_populations
  add column if not exists six_month_counts jsonb not null default '[]'::jsonb,
  add column if not exists six_month_average numeric,
  add column if not exists six_month_minimum integer,
  add column if not exists six_month_maximum integer,
  add column if not exists peak_window_source_label text,
  add column if not exists applicability_status text check (applicability_status is null or applicability_status in ('applicable','exempt','needs_review')),
  add column if not exists applicability_reason text;

create table if not exists public.rule2202_methodology_versions (
  id uuid primary key default gen_random_uuid(),
  version_key text not null unique,
  title text not null,
  source_url text not null,
  effective_from date not null,
  effective_to date,
  rule_text_hash text,
  formula_catalog jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.rule2202_survey_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.organization_sites(id) on delete cascade,
  reporting_year_id uuid not null references public.rule2202_reporting_years(id) on delete cascade,
  source_id uuid references public.data_sources(id) on delete set null,
  source_row_key text not null,
  participant_key text not null,
  observation_date date not null,
  commute_mode text not null,
  vehicle_occupancy integer,
  one_way_miles numeric,
  commute_days numeric not null default 1 check (commute_days >= 0),
  reported_to_site boolean not null default true,
  remote_day boolean not null default false,
  validation_status text not null default 'unvalidated' check (validation_status in ('unvalidated','valid','warning','blocking_error','excluded')),
  original_payload jsonb not null default '{}'::jsonb,
  superseded_at timestamptz,
  superseded_by uuid references public.rule2202_survey_records(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists rule2202_survey_records_year_idx on public.rule2202_survey_records(reporting_year_id, validation_status);
create unique index if not exists rule2202_survey_records_current_row_idx on public.rule2202_survey_records(reporting_year_id, source_row_key) where superseded_at is null;

create table if not exists public.rule2202_zip_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.organization_sites(id) on delete cascade,
  reporting_year_id uuid not null references public.rule2202_reporting_years(id) on delete cascade,
  source_id uuid references public.data_sources(id) on delete set null,
  participant_key text not null,
  home_zip text not null,
  one_way_miles numeric,
  distance_source text,
  commute_days numeric not null default 1 check (commute_days >= 0),
  validation_status text not null default 'unvalidated' check (validation_status in ('unvalidated','valid','warning','blocking_error','excluded')),
  original_payload jsonb not null default '{}'::jsonb,
  superseded_at timestamptz,
  superseded_by uuid references public.rule2202_zip_records(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists rule2202_zip_records_year_idx on public.rule2202_zip_records(reporting_year_id, validation_status);

create table if not exists public.rule2202_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.organization_sites(id) on delete cascade,
  reporting_year_id uuid not null references public.rule2202_reporting_years(id) on delete cascade,
  package_id uuid references public.rule2202_compliance_packages(id) on delete set null,
  decision text not null check (decision in ('requires_changes','approved_for_filing','rejected','withdrawn')),
  decision_note text not null,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now(),
  supersedes_review_id uuid references public.rule2202_reviews(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists rule2202_reviews_year_idx on public.rule2202_reviews(reporting_year_id, decided_at desc);

create table if not exists public.rule2202_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid references public.organization_sites(id) on delete set null,
  reporting_year_id uuid references public.rule2202_reporting_years(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('created','updated','approved','rejected','filed','superseded','exported')),
  actor_id uuid references auth.users(id) on delete set null,
  before_snapshot jsonb,
  after_snapshot jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists rule2202_audit_events_year_idx on public.rule2202_audit_events(reporting_year_id, occurred_at desc);

alter table public.rule2202_compliance_packages
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approval_note text,
  add column if not exists superseded_by uuid references public.rule2202_compliance_packages(id) on delete set null,
  add column if not exists retention_until date,
  add column if not exists export_hash text;

alter table public.rule2202_methodology_versions enable row level security;
alter table public.rule2202_survey_records enable row level security;
alter table public.rule2202_zip_records enable row level security;
alter table public.rule2202_reviews enable row level security;
alter table public.rule2202_audit_events enable row level security;

create policy rule2202_methodology_versions_select on public.rule2202_methodology_versions for select to authenticated using (true);
create policy rule2202_survey_records_select on public.rule2202_survey_records for select to authenticated using (private.can_analyze_org(organization_id));
create policy rule2202_survey_records_manage on public.rule2202_survey_records for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy rule2202_zip_records_select on public.rule2202_zip_records for select to authenticated using (private.can_analyze_org(organization_id));
create policy rule2202_zip_records_manage on public.rule2202_zip_records for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy rule2202_reviews_select on public.rule2202_reviews for select to authenticated using (private.can_analyze_org(organization_id));
create policy rule2202_reviews_manage on public.rule2202_reviews for all to authenticated using (private.can_review_org(organization_id)) with check (private.can_review_org(organization_id));
create policy rule2202_audit_events_select on public.rule2202_audit_events for select to authenticated using (private.can_analyze_org(organization_id));
create policy rule2202_audit_events_insert on public.rule2202_audit_events for insert to authenticated with check (private.can_review_org(organization_id));

revoke update, delete on public.rule2202_audit_events from authenticated;
