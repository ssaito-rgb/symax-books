"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AccountFormState = { error?: string };

export async function upsertAccount(_prevState: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const supabase = await createClient();

  const id = formData.get("id") as string | null;
  const payload = {
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? ""),
    normal_balance: String(formData.get("normal_balance") ?? ""),
    subcategory: (formData.get("subcategory") as string) || null,
    default_tax_category_code: (formData.get("default_tax_category_code") as string) || null,
    requires_counterparty: formData.get("requires_counterparty") === "on",
    description: (formData.get("description") as string) || null,
  };

  if (!payload.code || !payload.name || !payload.category || !payload.normal_balance) {
    return { error: "科目コード・科目名・区分・貸借区分は必須です。" };
  }

  const { error } = id
    ? await supabase.from("chart_of_accounts").update(payload).eq("id", id)
    : await supabase.from("chart_of_accounts").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function toggleAccountActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chart_of_accounts")
    .update({ is_active: !isActive })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/accounts");
}
