-- partial index を通常の unique index に変更する
-- 背景: PostgREST の ON CONFLICT は WHERE 句付き partial index を conflict target に指定できない
-- 解決: 通常の unique index に変更。PostgreSQL は UNIQUE index で NULL を「不等」として扱うため
--       (NULL != NULL) 複数の NULL 行が共存でき、既存の制約ロジックを維持できる
--       例: partner 行は cbo_company_user_id = NULL が多数あっても競合しない

-- 既存の partial index を削除
drop index if exists workers_employee_uq;
drop index if exists workers_partner_uq;

-- 失敗した過去の取込で重複が発生している場合に備えてデデュプ
-- 同一 cbo_company_user_id の重複員 → 新しい方を削除
delete from workers
where id in (
  select a.id
  from workers a
  join workers b
    on a.cbo_company_user_id = b.cbo_company_user_id
  where a.cbo_company_user_id is not null
    and a.id > b.id
);

-- 同一 (cbo_supplier_id, cbo_supplier_staff_id) の重複パートナー → 新しい方を削除
delete from workers
where id in (
  select a.id
  from workers a
  join workers b
    on a.cbo_supplier_id = b.cbo_supplier_id
    and a.cbo_supplier_staff_id = b.cbo_supplier_staff_id
  where a.cbo_supplier_id is not null
    and a.id > b.id
);

-- 通常の unique index を作成（NULL は複数許容される）
create unique index workers_employee_uq
  on workers (cbo_company_user_id);

create unique index workers_partner_uq
  on workers (cbo_supplier_id, cbo_supplier_staff_id);
