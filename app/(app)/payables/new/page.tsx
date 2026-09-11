import { getAccounts, getCounterparties, getFiscalYears } from "@/lib/accounting/queries";
import PurchaseInvoiceForm from "@/components/PurchaseInvoiceForm";

export default async function NewPurchaseInvoicePage() {
  const [accounts, counterparties, fiscalYears] = await Promise.all([
    getAccounts(),
    getCounterparties(),
    getFiscalYears(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">請求書を登録（買掛金）</h1>
      <PurchaseInvoiceForm accounts={accounts} counterparties={counterparties} fiscalYears={fiscalYears} />
    </div>
  );
}
