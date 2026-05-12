"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ASPECT = 1920 / 887;

type Props = {
  src: string;
  alt: string;
  caption: string;
  priority?: boolean;
};

export default function HelpGuideScreenshot({ src, alt, caption, priority }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxOpen, close]);

  const lightbox =
    lightboxOpen && mounted ? (
      <div
        className="fixed inset-0 z-[300] flex cursor-zoom-out items-center justify-center bg-black/82 p-3 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Full-size screenshot"
        onClick={close}
      >
        <span className="pointer-events-none absolute right-3 top-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm sm:right-5 sm:top-5">
          Click anywhere or press Esc to close
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element -- lightbox needs native max dimensions without layout pipeline */}
        <img
          src={src}
          alt={alt}
          className="pointer-events-none max-h-[min(95vh,887px)] w-auto max-w-[min(95vw,1920px)] object-contain shadow-2xl"
        />
      </div>
    ) : null;

  return (
    <figure className="group/my-fig my-8 w-full sm:my-10">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="block w-full max-w-[min(100%,900px)] cursor-zoom-in rounded-xl border-2 border-stone-300/90 bg-stone-50/80 text-left shadow-[0_8px_30px_-8px_rgba(0,0,0,0.18),0_2px_8px_-2px_rgba(0,0,0,0.08)] outline-none ring-stone-900/5 transition hover:border-[color:color-mix(in_oklab,var(--accent)_35%,var(--border-warm))] hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.22),0_0_0_1px_color-mix(in_oklab,var(--accent)_12%,transparent)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40 group-hover/my-fig:border-[color:color-mix(in_oklab,var(--accent)_35%,var(--border-warm))] group-hover/my-fig:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.22),0_0_0_1px_color-mix(in_oklab,var(--accent)_12%,transparent)] dark:border-stone-600 dark:bg-zinc-900/60 dark:ring-white/10 dark:hover:border-[color:color-mix(in_oklab,var(--accent)_40%,transparent)] dark:group-hover/my-fig:border-[color:color-mix(in_oklab,var(--accent)_40%,transparent)]"
        aria-label={`View full size: ${alt}`}
      >
        <div
          className="relative w-full overflow-hidden rounded-[10px]"
          style={{ aspectRatio: `${ASPECT}` }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            className="object-contain object-center"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 90vw, 900px"
          />
        </div>
      </button>
      <figcaption className="mx-auto mt-2 max-w-[min(100%,900px)] border-t border-transparent px-1 pt-2 text-center text-sm italic text-zinc-600 dark:text-zinc-400 sm:px-2">
        {caption}
        <span className="mt-1 block text-xs font-medium not-italic text-[color:var(--accent)] group-hover/my-fig:underline">
          Click image for full size
        </span>
      </figcaption>
      {mounted && lightbox ? createPortal(lightbox, document.body) : null}
    </figure>
  );
}
