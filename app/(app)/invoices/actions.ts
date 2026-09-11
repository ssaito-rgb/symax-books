"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createSalesInvoiceDraft,
  finalizeSalesInvoice,
  getSalesInvoice,
  getSalesInvoiceLines,
  getCounterparties,
  markSalesInvoiceSent,
  recordSalesInvoicePayment,
} from "@/lib/accounting/queries";
import { sendEmail } from "@/lib/email/resend";

export async function createDraftAction(formData: FormData) {
  const lines = JSON.parse(String(formData.get("lines"))) as Array<{
    description: string;
    revenue_account_id: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;

  const id = await createSalesInvoiceDraft(
    {
      counterparty_id: String(formData.get("counterparty_id")),
      fiscal_year_id: String(formData.get("fiscal_year_id")),
      issue_date: String(formData.get("issue_date")),
      due_date: (formData.get("due_date") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    },
    lines,
  );
  redirect(`/invoices/${id}`);
}

export async function finalizeAction(formData: FormData) {
  const invoiceId = String(formData.get("invoice_id"));
  await finalizeSalesInvoice(invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

export async function sendInvoiceAction(formData: FormData) {
  const invoiceId = String(formData.get("invoice_id"));
  const recipientEmail = String(formData.get("recipient_email"));
  const detailUrl = `/invoices/${invoiceId}`;

  try {
    const invoice = await getSalesInvoice(invoiceId);
    if (!invoice) throw new Error("請求書が見つかりません");
    const lines = await getSalesInvoiceLines(invoiceId);
    const counterparties = await getCounterparties();
    const client = counterparties.find((c) => c.id === invoice.counterparty_id);

    const rows = lines
      .map(
        (l) =>
          `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${l.description}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">${l.quantity}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">¥${l.unit_price.toLocaleString("ja-JP")}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">¥${l.amount.toLocaleString("ja-JP")}</td></tr>`,
      )
      .join("");
    const total = lines.reduce((sum, l) => sum + l.amount, 0);

    const html = `
      <p>${client?.name ?? ""} 御中</p>
      <p>いつもお世話になっております。Symax Partners合同会社です。下記の通りご請求申し上げます。</p>
      <p>請求書番号: ${invoice.invoice_number}<br/>請求日: ${invoice.issue_date}<br/>お支払期限: ${invoice.due_date ?? "-"}</p>
      <table style="border-collapse:collapse;">
        <thead><tr><th style="padding:4px 8px;border:1px solid #ddd;">品目</th><th style="padding:4px 8px;border:1px solid #ddd;">数量</th><th style="padding:4px 8px;border:1px solid #ddd;">単価</th><th style="padding:4px 8px;border:1px solid #ddd;">金額</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p>ご請求金額合計: ¥${total.toLocaleString("ja-JP")}</p>
      <p style="font-size:12px;color:#666;">当社は消費税免税事業者のため、本請求書は適格請求書（インボイス）には該当しません。</p>
    `;

    await sendEmail({
      to: recipientEmail,
      subject: `【ご請求】${invoice.invoice_number}（Symax Partners合同会社）`,
      html,
    });

    await markSalesInvoiceSent(invoiceId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "送信に失敗しました";
    redirect(`${detailUrl}?sendError=${encodeURIComponent(message)}`);
  }

  revalidatePath(detailUrl);
  redirect(`${detailUrl}?sent=1`);
}

export async function recordPaymentAction(formData: FormData) {
  const invoiceId = String(formData.get("invoice_id"));
  const receivedDate = String(formData.get("received_date"));
  const amount = Number(formData.get("amount"));
  await recordSalesInvoicePayment(invoiceId, receivedDate, amount);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}
