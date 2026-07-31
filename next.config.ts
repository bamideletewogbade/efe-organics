import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Cross-document view transitions between routes. The transition itself is
     * styled in globals.css (`::view-transition-*`) and is a 160/320ms
     * cross-fade — enough to make navigation feel continuous, short enough that
     * it never delays a tap. Falls back to an instant swap where unsupported.
     */
    viewTransition: true,
  },
  images: {
    // Product imagery is served from /public today. Kept for when the
    // catalogue moves to hosted storage.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
