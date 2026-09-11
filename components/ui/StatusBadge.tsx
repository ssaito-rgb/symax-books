const COLOR_STYLES: Record<string, string> = {
  gray: "bg-gray-100 text-gray-600",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
};

export default function StatusBadge({ label, color }: { label: string; color: keyof typeof COLOR_STYLES }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_STYLES[color]}`}>{label}</span>;
}
