"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

export type IllustrationSize = "empty" | "compact" | "hero" | "tall";

const sizeClass: Record<IllustrationSize, string> = {
  empty:
    "max-w-[min(100%,12.5rem)] sm:max-w-[min(100%,16rem)] lg:max-w-[min(100%,21.875rem)]",
  compact: "max-w-[10rem] sm:max-w-[11rem]",
  hero: "max-w-[10rem] sm:max-w-[12.5rem]",
  tall: "max-w-[min(100%,11rem)] sm:max-w-[min(100%,13rem)]",
};

type Props = {
  src: string;
  alt: string;
  /** Intrinsic dimensions from SVG viewBox (preserves aspect ratio). */
  width: number;
  height: number;
  size?: IllustrationSize;
  className?: string;
  priority?: boolean;
};

export function CollectionOpsIllustration({ src, alt, width, height, size = "empty", className, priority }: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={`relative mx-auto w-full ${sizeClass[size]} ${className ?? ""}`}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(max-width: 640px) 200px, (max-width: 1024px) 280px, 350px"
        className="h-auto w-full select-none [filter:drop-shadow(0_10px_28px_rgba(46,125,50,0.12))] dark:[filter:drop-shadow(0_12px_32px_rgba(0,0,0,0.35))]"
        priority={priority}
      />
    </motion.div>
  );
}
