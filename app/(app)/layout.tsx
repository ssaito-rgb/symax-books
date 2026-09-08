import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/journal", label: "仕訳" },
  { href: "/ledger", label: "総勘定元帳" },
  { href: "/trial-balance", label: "試算表" },
  { href: "/reports/pl", label: "損益計算書" },
  { href: "/reports/bs", label: "貸借対照表" },
  { href: "/accounts", label: "勘定科目" },
  { href: "/export", label: "エクスポート" },
  { href: "/settings/fiscal-years", label: "設定" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold">Symax Books</span>
            <nav className="hidden gap-4 text-sm text-gray-600 md:flex">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-indigo-600">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{user?.email}</span>
            <LogoutButton />
          </div>
        </div>
        <nav className="flex gap-3 overflow-x-auto border-t border-gray-100 px-4 py-2 text-xs text-gray-600 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap hover:text-indigo-600">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
