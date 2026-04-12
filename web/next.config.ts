import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/imports", destination: "/data", permanent: false }];
  },
  /** Use this app as Turbopack root so the parent repo lockfile is not mistaken for the project root */
  turbopack: {
    root: path.join(__dirname),
  },
  /**
   * Hide the default dev build indicator (e.g. “Compiling…”) for a calmer UI in development.
   * Production builds omit this overlay entirely.
   */
  devIndicators: false,
};

export default nextConfig;
