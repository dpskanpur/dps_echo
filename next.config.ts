import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",

  // `next dev` and `next build` both write to .next by default, and they
  // disagree about asset hashes. A build run while the dev server is up
  // leaves manifests pointing at CSS chunks the other mode never emitted,
  // which surfaces as a page rendering with no styles at all.
  //
  // Docker and Cloud Build keep the default, so the image layout is
  // unchanged; a local verification build sets NEXT_DIST_DIR=.next-build
  // and stays out of the dev cache entirely.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
