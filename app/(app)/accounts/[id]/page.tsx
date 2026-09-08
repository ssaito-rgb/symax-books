import { notFound } from "next/navigation";
import { getAccounts, getTaxCategories } from "@/lib/accounting/queries";
import AccountForm from "@/components/AccountForm";

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [accounts, taxCategories] = await Promise.all([getAccounts(true), getTaxCategories()]);
  const account = accounts.find((a) => a.id === id);
  if (!account) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">勘定科目を編集：{account.name}</h1>
      <AccountForm account={account} taxCategories={taxCategories} />
    </div>
  );
}
