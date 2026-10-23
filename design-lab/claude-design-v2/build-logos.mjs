// Копіює лого Echo Roof в project/assets/Logos/ як pw-*.svg.
//
//   node build-logos.mjs [тека-з-лого]      за замовчуванням D:/tmp/ws7-lab/ds/logo
//
// Геометрія не змінюється. Єдина правка: картинки в «Assets» показуються через <img>, а там currentColor не
// успадковується, тож знак фарбується ЧОРНИЛОМ СВІТЛОЇ ТЕМИ (primary #445dad; напис лок-апа — foreground #1a1814).
// Це ті самі файли, що були в попередній версії системи. app-icon і favicon копіюються як є.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = process.argv[2] ?? "D:/tmp/ws7-lab/ds/logo";
const OUT = path.join(root, "project", "assets", "Logos");
const PRIMARY = "#445dad";
const FOREGROUND = "#1a1814";
fs.mkdirSync(OUT, { recursive: true });

const files = {
  "mark.svg": "pw-mark.svg",
  "lockup.svg": "pw-lockup.svg",
  "app-icon.svg": "pw-app-icon.svg",
  "mark-20.svg": "pw-mark-20.svg",
  "mark-16.svg": "pw-mark-16.svg",
  "favicon.svg": "pw-favicon.svg",
};

for (const [from, to] of Object.entries(files)) {
  let svg = fs.readFileSync(path.join(SRC, from), "utf8").replace(/\r\n/g, "\n");
  if (from === "lockup.svg") {
    svg = svg.replace(/(<text[^>]*?) fill="currentColor"/, `$1 fill="${FOREGROUND}"`);
  }
  if (["mark.svg", "mark-20.svg", "mark-16.svg", "lockup.svg"].includes(from)) {
    svg = svg.replace(/(stroke|fill)="currentColor"/g, `$1="${PRIMARY}"`);
  }
  if (/currentColor/.test(svg) && from !== "app-icon.svg") throw new Error(`${from}: лишився currentColor`);
  fs.writeFileSync(path.join(OUT, to), svg);
}
console.log(`скопійовано ${Object.keys(files).length} файлів у ${OUT}`);
