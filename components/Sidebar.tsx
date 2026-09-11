"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

type NavItem = { href: string; label: string };
type NavGroup = { label?: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "ダッシュボード" }] },
  {
    label: "記帳",
    items: [
      { href: "/journal", label: "仕訳" },
      { href: "/receipts/bulk", label: "領収書の一括読込" },
    ],
  },
  {
    label: "債権・債務",
    items: [
      { href: "/invoices", label: "請求書（売掛金）" },
      { href: "/payables", label: "買掛金" },
    ],
  },
  {
    label: "レポート",
    items: [
      { href: "/ledger", label: "総勘定元帳" },
      { href: "/trial-balance", label: "試算表" },
      { href: "/reports/pl", label: "損益計算書" },
      { href: "/reports/bs", label: "貸借対照表" },
    ],
  },
  {
    label: "マスタ・設定",
    items: [
      { href: "/accounts", label: "勘定科目" },
      { href: "/export", label: "エクスポート" },
      { href: "/settings/fiscal-years", label: "設定" },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

function SidebarLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group, idx) => (
        <div key={idx} className={idx > 0 ? "mt-5" : ""}>
          {group.label && (
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{group.label}</p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                    active ? "bg-indigo-50 font-medium text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function Sidebar({ userEmail }: { userEmail: string | null | undefined }) {
  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="border-b border-gray-200 px-4 py-4">
          <span className="text-base font-semibold text-indigo-600">Symax Books</span>
        </div>
        <SidebarLinks />
        <div className="border-t border-gray-200 px-4 py-3">
          <p className="truncate text-xs text-gray-500">{userEmail}</p>
          <div className="mt-1 text-xs">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Mobile: horizontal scroll bar of top-level links, grouped nav lives behind a simple scroll */}
      <div className="border-b border-gray-200 bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-base font-semibold text-indigo-600">Symax Books</span>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="max-w-[120px] truncate">{userEmail}</span>
            <LogoutButton />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 text-xs">
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
