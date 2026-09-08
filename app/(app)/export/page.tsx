export default function ExportPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">エクスポート</h1>
      <p className="text-sm text-gray-600">
        全仕訳データをCSV形式でダウンロードします。バックアップ・監査用の汎用形式です（特定の会計ソフトのインポート形式ではありません）。
      </p>
      <a
        href="/api/export-csv"
        className="self-start rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        CSVをダウンロード
      </a>
    </div>
  );
}
