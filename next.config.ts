import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Cross-document view transitions between routes. The transition itself is
     * styled in globals.css (`::view-transition-*`) and is a 160/320ms
     * cross-fade. Enough to make navigation feel continuous, short enough that
     * it never delays a tap. Falls back to an instant swap where unsupported.
     */
    viewTransition: true,

    /**
     * Server actions accept a 1MB body by default, which is fine for a form and
     * useless for a file. The admin uploads two kinds of file: documents, capped
     * at 8MB in the action itself, and spreadsheet exports, which are re-sent to
     * be parsed server-side. 12MB leaves headroom above the 8MB document cap
     * without turning the action endpoint into somewhere to park a video.
     */
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  images: {
    // Product imagery is served from /public today. Kept for when the
    // catalogue moves to hosted storage.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
