import { put, del } from "@vercel/blob";
import { env } from "@/env";

export async function uploadProfileImage(userId: string, dataUrl: string): Promise<string> {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return dataUrl;
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data");
  }

  const [, contentType, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  const blob = await put(`avatars/${userId}-${Date.now()}`, buffer, {
    access: "public",
    contentType,
    token: env.BLOB_READ_WRITE_TOKEN,
  });

  return blob.url;
}

export async function deleteProfileImageIfBlob(url: string | null | undefined) {
  if (!url || !env.BLOB_READ_WRITE_TOKEN) return;
  if (!url.includes("blob.vercel-storage.com")) return;

  try {
    await del(url, { token: env.BLOB_READ_WRITE_TOKEN });
  } catch {
    // Best-effort cleanup
  }
}
