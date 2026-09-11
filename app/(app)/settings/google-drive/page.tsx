import { createClient } from "@/lib/supabase/server";
import { isGoogleConnected } from "@/lib/google/oauth";
import { disconnectGoogleAction } from "@/app/(app)/settings/actions";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "認証の有効期限が切れました。もう一度お試しください。",
  no_refresh_token: "Googleから継続利用に必要な情報を取得できませんでした。一度アクセス権を解除してから再接続してください（https://myaccount.google.com/permissions）。",
  exchange_failed: "Google側との通信に失敗しました。もう一度お試しください。",
  access_denied: "アクセスが許可されませんでした。",
};

export default async function GoogleDriveSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const connected = await isGoogleConnected(supabase);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        領収書の写真をアップロードした際に、OCRで読み取った内容をもとにGoogle Driveへ自動保存するための連携です。アプリが作成したファイルのみにアクセスできる限定的な権限（drive.file）のみ要求します。
      </p>

      {params.connected && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Google Driveへの接続が完了しました。
        </div>
      )}
      {params.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {ERROR_MESSAGES[params.error] ?? "接続に失敗しました。"}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {connected ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-700">✓ Google Driveに接続済みです</span>
            <form action={disconnectGoogleAction}>
              <button type="submit" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
                接続を解除
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">まだGoogle Driveに接続されていません</span>
            <a
              href="/api/google/oauth"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Googleに接続
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
