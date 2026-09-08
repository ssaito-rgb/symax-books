import Link from "next/link";

const TABS = [
  { href: "/settings/fiscal-years", label: "会計期間" },
  { href: "/settings/counterparties", label: "取引先マスタ" },
  { href: "/settings/tax-categories", label: "消費税区分" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">設定</h1>
      <div className="flex gap-4 border-b border-gray-200 text-sm">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="pb-2 text-gray-600 hover:text-indigo-600">
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
