/** Shrink a photo in the browser to a centred square (default 320 px), as WebP (JPEG if WebP is unsupported). */
export async function squareThumb(file: File, size = 320, quality = 0.8): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Pilih file gambar.");
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pengolahan gambar.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  bmp.close();
  const webp = canvas.toDataURL("image/webp", quality);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality);
}
