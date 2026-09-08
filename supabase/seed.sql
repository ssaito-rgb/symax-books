-- Seed data: tax categories, chart of accounts, first fiscal year.
-- Safe to re-run (uses ON CONFLICT DO NOTHING on natural keys).

insert into tax_categories (code, name, rate, direction) values
  ('out_of_scope', '不課税', 0, 'none'),
  ('exempt', '非課税', 0, 'none'),
  ('taxable_sales_10', '課税売上10%', 10, 'sales'),
  ('taxable_sales_8', '課税売上8%（軽減税率）', 8, 'sales'),
  ('taxable_purchase_10', '課税仕入10%', 10, 'purchases'),
  ('taxable_purchase_8', '課税仕入8%（軽減税率）', 8, 'purchases')
on conflict (code) do nothing;

insert into chart_of_accounts (code, name, category, subcategory, normal_balance, requires_counterparty, description) values
  -- 資産
  ('1001', '現金', 'asset', '流動資産', 'debit', false, null),
  ('1002', '普通預金', 'asset', '流動資産', 'debit', false, null),
  ('1200', '仮払消費税', 'asset', '流動資産', 'debit', false, '課税事業者になった場合のみ使用'),
  ('1090', '創立費', 'asset', '繰延資産', 'debit', false, '会社設立準備〜登記完了までの費用'),
  -- 負債
  ('2002', '未払金', 'liability', '流動負債', 'credit', true, '勘定科目内訳明細書の取引先別集計対象'),
  ('2100', '仮受消費税', 'liability', '流動負債', 'credit', false, '課税事業者になった場合のみ使用'),
  -- 純資産
  ('3001', '資本金', 'equity', null, 'credit', false, null),
  -- 売上
  ('4001', '研修売上（コースS）', 'revenue', null, 'credit', false, 'セーフゾーン活用コースの研修費用'),
  ('4002', '研修売上（コースP）', 'revenue', null, 'credit', false, '閉域フル活用コースの研修費用'),
  ('4003', 'コンサル売上', 'revenue', null, 'credit', false, '生成AI活用コンサルティング業務'),
  ('4004', '営業代行売上', 'revenue', null, 'credit', false, '営業代行・営業支援コンサルティング業務'),
  ('4005', '教材売上', 'revenue', null, 'credit', false, '教材・学習コンテンツの販売'),
  ('4009', 'その他売上', 'revenue', null, 'credit', false, '上記に該当しない売上'),
  -- 経費
  ('5001', '講師外注費', 'expense', null, 'debit', false, 'クラウドワークス等経由の外注講師への支払い'),
  ('5002', '業務委託費（村澤氏）', 'expense', null, 'debit', false, '村澤氏への業務委託報酬'),
  ('5003', '支払報酬（外部委託）', 'expense', null, 'debit', false, 'freee定款作成代行・士業等への支払い'),
  ('5004', '地代家賃', 'expense', null, 'debit', false, 'METSバーチャルオフィス利用料'),
  ('5005', '通信費', 'expense', null, 'debit', false, 'Google Workspace（Gmail）・電話等'),
  ('5006', '支払手数料', 'expense', null, 'debit', false, '銀行振込手数料・決済手数料等'),
  ('5007', '租税公課', 'expense', null, 'debit', false, '登録免許税・法人住民税均等割・収入印紙等'),
  ('5008', '旅費交通費', 'expense', null, 'debit', false, '打合せ・郵便物受取等の交通費'),
  ('5009', '会議費', 'expense', null, 'debit', false, '打合せ時の飲食代等'),
  ('5010', '消耗品費', 'expense', null, 'debit', false, '印鑑・文房具・備品等'),
  ('5011', '広告宣伝費', 'expense', null, 'debit', false, 'LP運用・広告出稿費用'),
  ('5012', '外注費（開発）', 'expense', null, 'debit', false, 'LP・システム開発の外注費'),
  ('5013', '新聞図書費', 'expense', null, 'debit', false, '書籍・情報サービス利用料'),
  ('5014', '諸会費', 'expense', null, 'debit', false, '各種会員費'),
  ('5099', '雑費', 'expense', null, 'debit', false, '上記に該当しない少額経費')
on conflict (code) do nothing;

insert into fiscal_years (label, start_date, end_date, tax_status) values
  ('第1期', '2026-09-01', '2027-08-31', 'undetermined')
on conflict (start_date, end_date) do nothing;
