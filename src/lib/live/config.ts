const DEFAULT_BACKEND_URL = "http://localhost:8000";

export function getBackendUrl(): string {
  return (process.env.NEXT_PUBLIC_SIGNALING_URL || DEFAULT_BACKEND_URL).replace(/\/$/, "");
}

export function getWebSocketUrl(): string {
  const backendUrl = new URL(getBackendUrl());
  backendUrl.protocol = backendUrl.protocol === "https:" ? "wss:" : "ws:";
  return backendUrl.toString().replace(/\/$/, "");
}

export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];
  const turnUrls = (process.env.NEXT_PUBLIC_TURN_URLS || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  if (turnUrls.length) {
    servers.push({
      urls: turnUrls,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME || undefined,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || undefined,
    });
  }
  return servers;
}

export function sessionApiUrl(
  path: string,
  token: string,
  parameters?: Record<string, string>,
): string {
  const url = new URL(path, `${getBackendUrl()}/`);
  url.searchParams.set("token", token);
  for (const [key, value] of Object.entries(parameters ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
