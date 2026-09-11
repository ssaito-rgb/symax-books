"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";

const TABS = [
  { href: "/settings/fiscal-years", label: "会計期間" },
  { href: "/settings/counterparties", label: "取引先マスタ" },
  { href: "/settings/tax-categories", label: "消費税区分" },
  { href: "/settings/google-drive", label: "Google Drive連携" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="設定" />
      <div className="flex gap-4 border-b border-gray-200 text-sm">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`pb-2 ${pathname === t.href ? "border-b-2 border-indigo-600 font-medium text-indigo-700" : "text-gray-600 hover:text-indigo-600"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
