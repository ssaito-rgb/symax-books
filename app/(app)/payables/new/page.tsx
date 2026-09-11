import { getAccounts, getCounterparties, getFiscalYears } from "@/lib/accounting/queries";
import PurchaseInvoiceForm from "@/components/PurchaseInvoiceForm";
import PageHeader from "@/components/ui/PageHeader";

export default async function NewPurchaseInvoicePage() {
  const [accounts, counterparties, fiscalYears] = await Promise.all([
    getAccounts(),
    getCounterparties(),
    getFiscalYears(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="請求書を登録（買掛金）" subtitle="受け取った請求書を記録します。金額・支払先を確認してください。" />
      <PurchaseInvoiceForm accounts={accounts} counterparties={counterparties} fiscalYears={fiscalYears} />
    </div>
  );
}
