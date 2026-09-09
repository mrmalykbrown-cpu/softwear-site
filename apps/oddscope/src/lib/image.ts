/**
 * Client-side screenshot preparation.
 *
 * Compression happens in the browser, before upload, for three reasons: a
 * phone screenshot is often 3-8MB and most of that is resolution the model
 * cannot use, the upload is the slowest part of the flow on mobile data, and
 * the image is billed by size on the way to the API. 1600px is comfortably
 * above what is needed to read a column of odds.
 */

export const MAX_WIDTH = 1600;
const JPEG_QUALITY = 0.82;

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export class ImageError extends Error {}

export async function compressScreenshot(file: File): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageError("That file type isn't supported. Use a PNG, JPG or WebP.");
  }

  // imageOrientation honours EXIF, so a photo taken in portrait does not arrive
  // sideways and unreadable.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError("We couldn't open that image. Try a different file.");
  }

  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new ImageError("Your browser couldn't process that image.");

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (!dataUrl.startsWith("data:image/jpeg")) {
    throw new ImageError("We couldn't process that image. Try a different file.");
  }

  return dataUrl;
}
