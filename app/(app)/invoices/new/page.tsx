import { getAccounts, getCounterparties, getFiscalYears } from "@/lib/accounting/queries";
import SalesInvoiceForm from "@/components/SalesInvoiceForm";
import PageHeader from "@/components/ui/PageHeader";

export default async function NewSalesInvoicePage() {
  const [accounts, counterparties, fiscalYears] = await Promise.all([
    getAccounts(),
    getCounterparties(),
    getFiscalYears(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="請求書を作成" subtitle="下書きとして保存されます。内容を確認してから確定・送信できます。" />
      <SalesInvoiceForm accounts={accounts} counterparties={counterparties} fiscalYears={fiscalYears} />
    </div>
  );
}
