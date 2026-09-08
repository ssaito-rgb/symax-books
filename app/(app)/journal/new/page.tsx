import { getAccounts, getCounterparties, getFiscalYears, getTaxCategories } from "@/lib/accounting/queries";
import JournalEntryForm from "@/components/JournalEntryForm";

export default async function NewJournalEntryPage() {
  const [accounts, counterparties, taxCategories, fiscalYears] = await Promise.all([
    getAccounts(),
    getCounterparties(),
    getTaxCategories(),
    getFiscalYears(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">仕訳を入力</h1>
      <JournalEntryForm
        accounts={accounts}
        counterparties={counterparties}
        taxCategories={taxCategories}
        fiscalYears={fiscalYears}
      />
    </div>
  );
}
