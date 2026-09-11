"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 print:hidden"
    >
      PDFとして保存 / 印刷
    </button>
  );
}
