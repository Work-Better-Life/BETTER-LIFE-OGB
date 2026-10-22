import { UTApi } from "uploadthing/server";

// Server-only access to UploadThing's API (reads UPLOADTHING_TOKEN from the
// environment).
const utapi = new UTApi();

const ATTEMPTS = 3;
const BATCH = 50;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function deleteBatch(keys: string[]) {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const result = await utapi.deleteFiles(keys);
      if (result.success && result.deletedCount > 0) return;
    } catch (error) {
      if (attempt === ATTEMPTS) console.error("Couldn't delete uploaded files", keys, error);
    }
    if (attempt < ATTEMPTS) await sleep(attempt * 700);
  }
  console.error("Couldn't delete uploaded files (nothing was deleted)", keys);
}

// Deleting is best-effort: a file that couldn't be removed is logged and left
// behind, never allowed to fail the request that triggered it. UploadThing can
// answer "0 deleted" for a file that was uploaded moments ago, so that case is
// retried a couple of times.
export async function deleteUploadedFiles(keys: Array<string | null | undefined>) {
  const real = Array.from(new Set(keys.filter((key): key is string => !!key)));
  for (let start = 0; start < real.length; start += BATCH) await deleteBatch(real.slice(start, start + BATCH));
}

export async function deleteUploadedFile(key: string) {
  await deleteUploadedFiles([key]);
}

// Every file in this UploadThing app, for the orphan check.
export async function listUploadedFiles() {
  const files: { key: string; name: string; uploadedAt: number }[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const page = await utapi.listFiles({ limit: pageSize, offset });
    for (const file of page.files) files.push({ key: file.key, name: file.name, uploadedAt: file.uploadedAt });
    if (!page.hasMore) break;
  }
  return files;
}
