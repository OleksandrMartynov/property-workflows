// Пише project/design-system.json (індекс v3, layout "files").
//
//   node build-index.mjs                                   зберігає наявні записи Logos (blob не чіпає, size оновлює з диска);
//                                                          якщо індексу ще немає — плейсхолдер із порожнім files
//   node build-index.mjs pw-mark.svg=<blob-id> …           після (пере)завантаження логотипів: записує/замінює ці записи
//                                                          assetGroups.Logos.files (size — із байтів файлу), решта лишається
//
// <blob-id> — 32 hex із відповіді завантаження (/_blob/<id>). createdOnFiles.at зберігається, якщо індекс
// уже є; lastChange.at щоразу — поточний час (RFC 3339, UTC).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const INDEX = path.join(root, "project", "design-system.json");
const LOGOS = path.join(root, "project", "assets", "Logos");
const order = ["pw-mark.svg", "pw-lockup.svg", "pw-app-icon.svg", "pw-mark-20.svg", "pw-mark-16.svg", "pw-favicon.svg"];
const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

let createdAt = now;
const files = {};
if (fs.existsSync(INDEX)) {
  try {
    const prev = JSON.parse(fs.readFileSync(INDEX, "utf8"));
    createdAt = prev.createdOnFiles?.at ?? now;
    // Без аргументів зберігаємо вже завантажені записи (blob не чіпаємо), лише оновлюємо size з файлу на диску.
    for (const [name, rec] of Object.entries(prev.assetGroups?.Logos?.files ?? {})) {
      if (order.includes(name) && fs.existsSync(path.join(LOGOS, name))) files[name] = { ...rec, size: fs.statSync(path.join(LOGOS, name)).size };
    }
  } catch { /* перезаписуємо */ }
}

for (const arg of process.argv.slice(2)) {
  const [name, blob] = arg.split("=");
  if (!order.includes(name)) throw new Error(`невідомий файл: ${name}`);
  if (!/^[0-9a-f]{32}$/.test(blob ?? "")) throw new Error(`${name}: blob-id має бути 32 hex, отримано «${blob}»`);
  files[name] = { name, blob, size: fs.statSync(path.join(LOGOS, name)).size, type: "image/svg+xml" };
}

const index = {
  v: 3,
  layout: "files",
  createdOnFiles: { v: 1, at: createdAt },
  title: "Property Workflows",
  namespace: "PropertyWorkflows",
  libraries: [],
  sections: {},
  groups: ["Logos"],
  assetGroups: { Logos: { name: "Logos", tile: "l", order, files } },
  blobs: {},
  docs: { readme: "project/README.md", sections: [] },
  lastChange: {
    by: "Oleksandr Martynov",
    via: "Claude Code",
    at: now,
    note: "Контроли форм (Select, Combobox, MultiSelect, DateTime, Choice, FileDrop), токени розмірів контролів, правило мінімуму тексту, шрифти Inter і JetBrains Mono; оновлено README, рух, екрани.",
  },
};
fs.writeFileSync(INDEX, JSON.stringify(index, null, 2) + "\n");
console.log(`design-system.json: Logos files ${Object.keys(files).length}/${order.length}, at ${now}`);
