"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { voidJournalEntry } from "@/lib/accounting/queries";

export async function voidEntryAction(formData: FormData) {
  const entryId = String(formData.get("entry_id"));
  const fiscalYearId = String(formData.get("fiscal_year_id"));
  await voidJournalEntry(entryId, fiscalYearId);
  revalidatePath("/journal");
  redirect("/journal");
}
