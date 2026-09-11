async function gcsFetch(accessToken: string, url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cloud Storageの呼び出しに失敗しました（HTTP ${res.status}）: ${body}`);
  }
  return res;
}

export async function uploadToGcs(
  accessToken: string,
  bucket: string,
  objectName: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(objectName)}`;
  await gcsFetch(accessToken, url, {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: buffer as unknown as BodyInit,
  });
}

export async function downloadFromGcs(accessToken: string, bucket: string, objectName: string): Promise<Buffer> {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}?alt=media`;
  const res = await gcsFetch(accessToken, url);
  return Buffer.from(await res.arrayBuffer());
}

export async function listGcsObjects(accessToken: string, bucket: string, prefix: string): Promise<string[]> {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?prefix=${encodeURIComponent(prefix)}`;
  const res = await gcsFetch(accessToken, url);
  const json = await res.json();
  return (json.items ?? []).map((item: { name: string }) => item.name);
}

/** Best-effort — failures here shouldn't fail the overall receipt upload. */
export async function deleteGcsObjectsQuietly(accessToken: string, bucket: string, objectNames: string[]) {
  await Promise.all(
    objectNames.map((name) =>
      gcsFetch(accessToken, `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}`, {
        method: "DELETE",
      }).catch(() => {}),
    ),
  );
}
