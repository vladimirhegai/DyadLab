import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright and local participant links may use the loopback IP while the
  // developer launches Next on localhost.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
