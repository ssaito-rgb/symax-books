"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordPurchaseInvoice, markPurchaseInvoicePaid } from "@/lib/accounting/queries";

export async function recordPurchaseInvoiceAction(formData: FormData) {
  await recordPurchaseInvoice({
    counterparty_id: String(formData.get("counterparty_id")),
    vendor_invoice_number: (formData.get("vendor_invoice_number") as string) || undefined,
    received_date: String(formData.get("received_date")),
    due_date: (formData.get("due_date") as string) || undefined,
    amount: Number(formData.get("amount")),
    expense_account_id: String(formData.get("expense_account_id")),
    fiscal_year_id: String(formData.get("fiscal_year_id")),
    evidence_url: (formData.get("evidence_url") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
  });
  revalidatePath("/payables");
  redirect("/payables");
}

export async function markPaidAction(formData: FormData) {
  const invoiceId = String(formData.get("invoice_id"));
  const paidDate = String(formData.get("paid_date"));
  const paidAmount = Number(formData.get("paid_amount"));
  await markPurchaseInvoicePaid(invoiceId, paidDate, paidAmount);
  revalidatePath("/payables");
}
