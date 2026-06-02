-- ============================================================
-- T1.1 スキーマ適用
-- Supabase SQL Editor に貼り付けて実行する
-- ============================================================

-- 拡張
create extension if not exists "pgcrypto";

-- ===== 選択肢マスタ（CBO custom_type） =====
create table day_yakan_options (
  id       text primary key,
  label    text not null,
  position int
);

create table work_content_options (
  id       text primary key,
  label    text not null,
  position int
);

create table health_type_options (
  id       text primary key,
  label    text not null,
  position int
);

-- ===== 現場マスタ =====
create table sites (
  id             uuid primary key default gen_random_uuid(),
  cbo_order_id   text unique not null,
  name           text not null,
  client_name    text,
  manager_name   text,
  is_asbestos    boolean not null default true,
  period_start   date,
  period_end     date,
  last_synced_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ===== 作業者マスタ =====
create type worker_source as enum ('employee', 'partner');

create table workers (
  id                    uuid primary key default gen_random_uuid(),
  source_kind           worker_source not null,
  cbo_company_user_id   text,
  cbo_supplier_id       text,
  cbo_supplier_staff_id text,
  company_name          text not null,
  worker_name           text not null,
  name_kana             text,
  tel                   text,
  is_active             boolean not null default true,
  last_synced_at        timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- 重複防止（NULL混在を避けるため部分 unique）
create unique index workers_employee_uq
  on workers (cbo_company_user_id)
  where source_kind = 'employee';

create unique index workers_partner_uq
  on workers (cbo_supplier_id, cbo_supplier_staff_id)
  where source_kind = 'partner';

-- ===== 出面記録 =====
create type sync_status_t as enum ('local_new', 'synced', 'local_edited', 'conflict');

create table daily_reports (
  id                   uuid primary key default gen_random_uuid(),
  site_id              uuid not null references sites(id) on delete cascade,
  worker_id            uuid not null references workers(id),
  work_date            date not null,
  reporter_cbo_user_id text,
  day_yakan_id         text references day_yakan_options(id),
  over_hour            numeric not null default 0,
  work_content_id      text references work_content_options(id),
  health_type_id       text references health_type_options(id) default '106556',
  is_corrected         boolean not null default false,
  cbo_report_id        text unique,
  sync_status          sync_status_t not null default 'local_new',
  cbo_synced_at        timestamptz,
  created_by           text,
  updated_by           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (site_id, worker_id, work_date)
);

create index daily_reports_site_date_idx on daily_reports (site_id, work_date);
create index daily_reports_sync_idx      on daily_reports (sync_status);

-- ===== 同期ログ（監査） =====
create table sync_logs (
  id               uuid primary key default gen_random_uuid(),
  direction        text not null check (direction in ('pull', 'push')),
  target           text not null check (target in ('site', 'worker', 'report')),
  record_id        uuid,
  cbo_report_id    text,
  status           text not null check (status in ('success', 'error')),
  message          text,
  payload_snapshot jsonb,
  performed_by     text,
  performed_at     timestamptz not null default now()
);

create index sync_logs_performed_idx on sync_logs (performed_at desc);

-- ===== updated_at 自動更新トリガ =====
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_sites_u
  before update on sites
  for each row execute function set_updated_at();

create trigger trg_workers_u
  before update on workers
  for each row execute function set_updated_at();

create trigger trg_reports_u
  before update on daily_reports
  for each row execute function set_updated_at();
