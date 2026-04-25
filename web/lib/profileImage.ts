/** Resize and compress to JPEG data URL for localStorage-friendly avatar. */

export function resizeImageToJpegDataUrl(file: File, maxEdge = 160, quality = 0.82): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) {
        resolve(null);
        return;
      }
      const scale = Math.min(1, maxEdge / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      try {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl.length > 600_000 ? null : dataUrl);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

const MAX_DATA_URL_CHARS = 600_000;

/**
 * Square crop centered at (cx, cy) in source pixels, then scale to maxEdge × maxEdge JPEG.
 * cx, cy are clamped implicitly by the caller; side must be ≤ min(naturalWidth, naturalHeight).
 */
export function exportSquareAvatarJpeg(
  img: HTMLImageElement,
  cx: number,
  cy: number,
  side: number,
  maxEdge = 160,
  quality = 0.82
): string | null {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  if (!W || !H || side <= 0) return null;

  const half = side / 2;
  const sx = Math.max(0, Math.round(cx - half));
  const sy = Math.max(0, Math.round(cy - half));
  const sMax = Math.min(W - sx, H - sy, Math.floor(side));
  if (sMax < 1) return null;

  const canvas = document.createElement("canvas");
  canvas.width = maxEdge;
  canvas.height = maxEdge;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, sx, sy, sMax, sMax, 0, 0, maxEdge, maxEdge);
  try {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return dataUrl.length > MAX_DATA_URL_CHARS ? null : dataUrl;
  } catch {
    return null;
  }
}
