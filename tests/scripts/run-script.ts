import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
export const fixtures = path.join(repoRoot, "tests", "fixtures");

// Тести скриптів синхронно запускають дочірні процеси (node, git). На Windows під навантаженням паралельних воркерів
// Vitest один такий тест іде довше за стандартні 5 с і падає «Test timed out» — тайм-аут задаємо в describe цих файлів.
export const SCRIPT_TEST_TIMEOUT = 30_000;

// Запускає scripts/<name> з робочою текою cwd (скрипти беруть корінь проєкту з process.cwd()).
export function runScript(name: string, cwd: string, env: Record<string, string | undefined> = {}) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, "scripts", name)], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, SPEC_DENYLIST: "", ...env },
  });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}
