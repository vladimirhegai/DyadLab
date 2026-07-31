import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const candidates = [
  process.env.DYADLAB_PYTHON,
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python",
  "python",
].filter(Boolean);

const python = candidates.find(
  (candidate) =>
    candidate === "python" || existsSync(candidate),
);

if (!python) {
  console.error(
    "No Python environment found. Create .venv and install backend/requirements.lock.",
  );
  process.exit(1);
}

const result = spawnSync(
  python,
  ["-m", "pytest", "backend/tests", "-q"],
  { stdio: "inherit", shell: false },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
