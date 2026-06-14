-- sites テーブルに CBO のステータス列を追加
alter table sites add column if not exists cbo_status text;
