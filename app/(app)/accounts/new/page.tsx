import { getTaxCategories } from "@/lib/accounting/queries";
import AccountForm from "@/components/AccountForm";
import PageHeader from "@/components/ui/PageHeader";

export default async function NewAccountPage() {
  const taxCategories = await getTaxCategories();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="勘定科目を追加" />
      <AccountForm taxCategories={taxCategories} />
    </div>
  );
}
