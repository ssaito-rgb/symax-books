-- 創立費の任意償却用の費用科目を追加
insert into chart_of_accounts (code, name, category, subcategory, normal_balance, requires_counterparty, description)
values ('5015', '創立費償却', 'expense', null, 'debit', false, '創立費の任意償却（会社計算規則上、任意のタイミングで費用化できる）')
on conflict (code) do nothing;
