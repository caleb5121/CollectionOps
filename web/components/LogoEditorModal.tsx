"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { exportSquareAvatarJpeg } from "../lib/profileImage";

export type LogoEditorSource = { kind: "file"; file: File } | { kind: "dataUrl"; dataUrl: string };

const PREVIEW = 280;
const MIN_SIDE_SRC = 48;

type Props = {
  open: boolean;
  source: LogoEditorSource | null;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export default function LogoEditorModal({ open, source, onClose, onSave }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef = useRef({ cx: 0, cy: 0 });
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [scale, setScale] = useState(1);
  const [cx, setCx] = useState(0);
  const [cy, setCy] = useState(0);
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 });

  useEffect(() => {
    posRef.current = { cx, cy };
  }, [cx, cy]);

  useEffect(() => {
    if (!open || !source) {
      imgRef.current = null;
      setDims(null);
      setLoadError(false);
      setScale(1);
      return;
    }

    setLoadError(false);
    setSaveError(false);
    setDims(null);
    imgRef.current = null;

    const objectUrl = source.kind === "file" ? URL.createObjectURL(source.file) : null;
    const url = source.kind === "file" ? objectUrl! : source.dataUrl;

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) {
        setLoadError(true);
        return;
      }
      imgRef.current = img;
      setDims({ w, h });
      setScale(1);
      const cx0 = w / 2;
      const cy0 = h / 2;
      setCx(cx0);
      setCy(cy0);
      posRef.current = { cx: cx0, cy: cy0 };
    };
    img.onerror = () => {
      imgRef.current = null;
      setLoadError(true);
    };
    img.src = url;

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, source]);

  const W = dims?.w ?? 0;
  const H = dims?.h ?? 0;
  const minDim = W && H ? Math.min(W, H) : 0;
  const side = minDim ? minDim / scale : 0;
  const maxScale = minDim ? Math.max(1, minDim / MIN_SIDE_SRC) : 1;

  const clampCenter = useCallback(
    (ncx: number, ncy: number, s: number) => {
      if (!W || !H) return { cx: ncx, cy: ncy };
      const half = s / 2;
      return {
        cx: clamp(ncx, half, W - half),
        cy: clamp(ncy, half, H - half),
      };
    },
    [W, H]
  );

  const redrawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !W || !H || side <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { cx: ucx, cy: ucy } = clampCenter(cx, cy, side);
    const half = side / 2;
    const sx = Math.max(0, Math.round(ucx - half));
    const sy = Math.max(0, Math.round(ucy - half));
    const sDraw = Math.min(W - sx, H - sy, Math.floor(side));

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, PREVIEW, PREVIEW);
    ctx.drawImage(img, sx, sy, sDraw, sDraw, 0, 0, PREVIEW, PREVIEW);
  }, [W, H, cx, cy, side, clampCenter]);

  useEffect(() => {
    redrawPreview();
  }, [redrawPreview]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imgRef.current || side <= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active || !W || !H || side <= 0) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    const factor = side / PREVIEW;
    const { cx: px, cy: py } = posRef.current;
    const next = clampCenter(px - dx * factor, py - dy * factor, side);
    setCx(next.cx);
    setCy(next.cy);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current.active) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    dragRef.current.active = false;
  };

  const handleSave = () => {
    const img = imgRef.current;
    if (!img || !W || !H || side <= 0) return;
    const { cx: ucx, cy: ucy } = clampCenter(cx, cy, side);
    const out = exportSquareAvatarJpeg(img, ucx, ucy, side);
    if (!out) {
      setSaveError(true);
      return;
    }
    setSaveError(false);
    onSave(out);
    onClose();
  };

  const handleResetCrop = () => {
    if (!W || !H) return;
    setScale(1);
    const cx0 = W / 2;
    const cy0 = H / 2;
    setCx(cx0);
    setCy(cy0);
    posRef.current = { cx: cx0, cy: cy0 };
  };

  if (!open || !source) return null;

  const ready = Boolean(dims && imgRef.current && !loadError);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logo-editor-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xl dark:border-slate-700/80 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <h2 id="logo-editor-title" className="text-lg font-bold text-slate-900 dark:text-slate-50">
            Logo editor
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Drag to reposition. Use the slider to zoom. The circle matches how your photo appears in the app.
        </p>

        {loadError ? (
          <p className="mt-4 text-sm font-medium text-rose-600 dark:text-rose-400">Could not load that image.</p>
        ) : (
          <>
            <div className="mt-4 flex justify-center">
              <div
                className="relative rounded-full border-4 border-white shadow-[0_8px_30px_-6px_rgba(15,23,42,0.35)] ring-2 ring-slate-200/90 dark:border-slate-800 dark:ring-slate-600/80"
                style={{ width: PREVIEW, height: PREVIEW }}
              >
                <canvas
                  ref={canvasRef}
                  width={PREVIEW}
                  height={PREVIEW}
                  className="block size-full cursor-grab touch-none rounded-full active:cursor-grabbing"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <span>Zoom</span>
                <span className="tabular-nums text-slate-500 dark:text-slate-500">{scale.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min={1}
                max={maxScale}
                step={0.02}
                value={clamp(scale, 1, maxScale)}
                disabled={!ready || maxScale <= 1}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setScale(next);
                  if (W && H) {
                    const s = Math.min(W, H) / next;
                    const c = clampCenter(cx, cy, s);
                    setCx(c.cx);
                    setCy(c.cy);
                  }
                }}
                className="w-full accent-[color:var(--accent)]"
              />
            </div>

            {saveError ? (
              <p className="mt-3 text-xs font-medium text-rose-600 dark:text-rose-400">
                Export failed. Try zooming out or a smaller source image.
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={handleResetCrop} className={secondaryClass} disabled={!ready}>
                Reset
              </button>
              <button type="button" onClick={onClose} className={secondaryClass}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!ready}
                className="inline-flex flex-1 min-w-[7rem] items-center justify-center rounded-xl bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save logo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const secondaryClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600/80 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800/90";
