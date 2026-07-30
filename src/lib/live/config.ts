const DEFAULT_BACKEND_URL = "http://localhost:8000";

export function getBackendUrl(): string {
  return (process.env.NEXT_PUBLIC_SIGNALING_URL || DEFAULT_BACKEND_URL).replace(/\/$/, "");
}

export function getWebSocketUrl(): string {
  const backendUrl = new URL(getBackendUrl());
  backendUrl.protocol = backendUrl.protocol === "https:" ? "wss:" : "ws:";
  return backendUrl.toString().replace(/\/$/, "");
}
