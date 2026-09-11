const FOLDER_MIME = "application/vnd.google-apps.folder";
const ROOT_FOLDER_NAME = "symax-books-receipts";

function escapeForDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function driveFetch(accessToken: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive APIの呼び出しに失敗しました（HTTP ${res.status}）: ${body}`);
  }
  return res.json();
}

async function findOrCreateFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  const parentClause = parentId ? ` and '${escapeForDriveQuery(parentId)}' in parents` : " and 'root' in parents";
  const q = `mimeType='${FOLDER_MIME}' and name='${escapeForDriveQuery(name)}' and trashed=false${parentClause}`;
  const listed = await driveFetch(accessToken, `files?q=${encodeURIComponent(q)}&fields=files(id)`);
  if (listed.files?.[0]?.id) return listed.files[0].id;

  const created = await driveFetch(accessToken, "files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      parents: parentId ? [parentId] : undefined,
    }),
  });
  return created.id;
}

/** Finds or creates the "<root>/YYYY-MM" folder for a receipt dated `isoDate` (defaults to today). */
export async function ensureYearMonthFolder(accessToken: string, isoDate?: string | null): Promise<string> {
  const rootId =
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || (await findOrCreateFolder(accessToken, ROOT_FOLDER_NAME));
  const yearMonth = (isoDate ?? new Date().toISOString().slice(0, 10)).slice(0, 7);
  return findOrCreateFolder(accessToken, yearMonth, rootId);
}

export async function uploadReceiptFile(
  accessToken: string,
  params: { buffer: Buffer; mimeType: string; filename: string; folderId: string },
): Promise<{ id: string; webViewLink: string }> {
  const boundary = `symax-books-${Date.now()}`;
  const metadata = JSON.stringify({ name: params.filename, parents: [params.folderId] });

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${params.mimeType}\r\n\r\n`),
    params.buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Driveへのアップロードに失敗しました（HTTP ${res.status}）: ${text}`);
  }
  return res.json();
}
