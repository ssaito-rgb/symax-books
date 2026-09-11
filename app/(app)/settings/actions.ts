"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { disconnectGoogle } from "@/lib/google/oauth";

export async function createFiscalYear(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("fiscal_years").insert({
    label: String(formData.get("label")),
    start_date: String(formData.get("start_date")),
    end_date: String(formData.get("end_date")),
  });
  if (error) throw error;
  revalidatePath("/settings/fiscal-years");
}

export async function updateFiscalYearTaxStatus(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const tax_status = String(formData.get("tax_status"));
  const { error } = await supabase.from("fiscal_years").update({ tax_status }).eq("id", id);
  if (error) throw error;
  revalidatePath("/settings/fiscal-years");
}

export async function toggleFiscalYearClosed(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const isClosed = formData.get("is_closed") === "true";
  const { error } = await supabase
    .from("fiscal_years")
    .update({ is_closed: !isClosed, closed_at: !isClosed ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/settings/fiscal-years");
}

export async function createCounterparty(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("counterparties").insert({
    name: String(formData.get("name")),
    kana: (formData.get("kana") as string) || null,
    is_qualified_invoice_issuer:
      formData.get("is_qualified_invoice_issuer") === "yes"
        ? true
        : formData.get("is_qualified_invoice_issuer") === "no"
          ? false
          : null,
    notes: (formData.get("notes") as string) || null,
  });
  if (error) throw error;
  revalidatePath("/settings/counterparties");
}

export async function disconnectGoogleAction() {
  const supabase = await createClient();
  await disconnectGoogle(supabase);
  revalidatePath("/settings/google-drive");
}
