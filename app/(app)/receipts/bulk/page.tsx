import { getAccounts, getCounterparties, getFiscalYears } from "@/lib/accounting/queries";
import BulkReceiptUpload from "@/components/BulkReceiptUpload";

export default async function BulkReceiptUploadPage() {
  const [accounts, counterparties, fiscalYears] = await Promise.all([
    getAccounts(),
    getCounterparties(),
    getFiscalYears(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">領収書の一括読み込み</h1>
        <p className="mt-1 text-sm text-gray-500">
          複数の領収書をまとめて選択すると、1枚ずつOCRで読み取り、それぞれ独立した仕訳として登録します。
        </p>
      </div>
      <BulkReceiptUpload accounts={accounts} counterparties={counterparties} fiscalYears={fiscalYears} />
    </div>
  );
}
