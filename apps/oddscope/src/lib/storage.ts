import "server-only";
import { env } from "./env";

/**
 * Where a screenshot ends up.
 *
 * With a Vercel Blob token configured, the image is uploaded and the row stores
 * a URL. Without one — a self-hosted deployment, a local checkout — the
 * compressed data URL is stored inline instead. That keeps the app runnable
 * with nothing but a database, at the cost of a larger Analysis row, and the
 * choice is made per-request rather than at build time so adding the token
 * later needs no migration.
 */
export async function putScreenshot(dataUrl: string, userId: string): Promise<string> {
  if (!env.blobToken) return dataUrl;

  try {
    const { put } = await import("@vercel/blob");
    const [header, base64] = dataUrl.split(",");
    const mediaType = /data:(image\/[a-zA-Z+]+);/.exec(header)?.[1] ?? "image/jpeg";
    const extension = mediaType.split("/")[1].replace("jpeg", "jpg");
    const body = Buffer.from(base64, "base64");

    const blob = await put(`screenshots/${userId}/${Date.now()}.${extension}`, body, {
      access: "public",
      contentType: mediaType,
      token: env.blobToken,
    });
    return blob.url;
  } catch {
    // Storage is not worth failing an analysis over — the odds have already
    // been read out of the image by the time this runs.
    return dataUrl;
  }
}
