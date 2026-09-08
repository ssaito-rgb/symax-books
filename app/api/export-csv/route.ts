import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccounts, getCounterparties, getPostedLines } from "@/lib/accounting/queries";
import { linesToCsv } from "@/lib/accounting/csv-export";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [lines, accounts, counterparties] = await Promise.all([
    getPostedLines(),
    getAccounts(true),
    getCounterparties(),
  ]);

  const csv = linesToCsv(lines, accounts, counterparties);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="symax-books-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
