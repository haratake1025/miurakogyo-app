-- sites テーブルに is_active カラムを追加（存在しない場合のみ）
alter table sites
  add column if not exists is_active boolean not null default true;
