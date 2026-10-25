// Обхід вихідних файлів для архітектурних перевірок (check-actions-auth, check-server-boundary).
// За символьними посиланнями не переходимо (цикл, вихід за корінь, пошкоджене посилання) — повертаємо їх окремо, щоб
// перевірка показала їх як порушення, а не мовчки пропустила. Теку не прочитано — помилка перевірки, а не «порушень немає».
import { readdirSync } from "node:fs";
import { join } from "node:path";

// .ts .tsx .mts .cts .js .jsx .mjs .cjs
export const SOURCE_EXT = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

/** Файли з SOURCE_EXT під `dir` і символьні посилання. Кидає Error з поясненням, якщо теку не вдалося прочитати. */
export function walkSources(dir, out = { files: [], links: [] }) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    throw new Error(`не вдалося прочитати теку ${dir} (${error.code ?? error.message})`);
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) out.links.push(full);
    else if (entry.isDirectory()) walkSources(full, out);
    else if (entry.isFile() && SOURCE_EXT.test(entry.name)) out.files.push(full);
  }
  return out;
}
