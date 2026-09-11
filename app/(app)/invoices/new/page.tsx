import { getAccounts, getCounterparties, getFiscalYears } from "@/lib/accounting/queries";
import SalesInvoiceForm from "@/components/SalesInvoiceForm";

export default async function NewSalesInvoicePage() {
  const [accounts, counterparties, fiscalYears] = await Promise.all([
    getAccounts(),
    getCounterparties(),
    getFiscalYears(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">請求書を作成</h1>
      <SalesInvoiceForm accounts={accounts} counterparties={counterparties} fiscalYears={fiscalYears} />
    </div>
  );
}
