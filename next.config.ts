import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the dev-tools badge away from the business-analysis sidebar footer.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
