import type { NextConfig } from "next";

const signalingUrl =
  process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:8000";
const signalingOrigin = new URL(signalingUrl).origin;
const signalingSocket = new URL(signalingUrl);
signalingSocket.protocol =
  signalingSocket.protocol === "https:" ? "wss:" : "ws:";
const signalingSocketOrigin = signalingSocket.origin;
const developmentScriptPolicy =
  process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${developmentScriptPolicy}`,
  `connect-src 'self' ${signalingOrigin} ${signalingSocketOrigin}`,
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Playwright and local participant links may use the loopback IP while the
  // developer launches Next on localhost.
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), geolocation=(), browsing-topics=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
