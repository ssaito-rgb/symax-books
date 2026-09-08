import { getTaxCategories } from "@/lib/accounting/queries";
import AccountForm from "@/components/AccountForm";

export default async function NewAccountPage() {
  const taxCategories = await getTaxCategories();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">勘定科目を追加</h1>
      <AccountForm taxCategories={taxCategories} />
    </div>
  );
}
