import { getAccounts, getCounterparties, getFiscalYears, getTaxCategories } from "@/lib/accounting/queries";
import JournalEntryForm from "@/components/JournalEntryForm";
import PageHeader from "@/components/ui/PageHeader";

export default async function NewJournalEntryPage() {
  const [accounts, counterparties, taxCategories, fiscalYears] = await Promise.all([
    getAccounts(),
    getCounterparties(),
    getTaxCategories(),
    getFiscalYears(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="仕訳を入力" subtitle="領収書をアップロードすると日付・金額を自動入力できます。" />
      <JournalEntryForm
        accounts={accounts}
        counterparties={counterparties}
        taxCategories={taxCategories}
        fiscalYears={fiscalYears}
      />
    </div>
  );
}
