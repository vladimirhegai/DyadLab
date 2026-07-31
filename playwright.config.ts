import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const localPython =
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python";
const pythonExecutable =
  process.env.DYADLAB_PYTHON ||
  (existsSync(localPython) ? localPython : "python");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        "--autoplay-policy=no-user-gesture-required",
      ],
    },
  },
  webServer: [
    {
      command: `"${pythonExecutable}" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000`,
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: true,
      timeout: 30_000,
      env: {
        DYADLAB_DATABASE_PATH: "backend/.test-data/playwright.db",
        DYADLAB_ALLOWED_ORIGINS: "http://127.0.0.1:3000",
      },
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        NEXT_PUBLIC_SIGNALING_URL: "http://127.0.0.1:8000",
      },
    },
  ],
});
