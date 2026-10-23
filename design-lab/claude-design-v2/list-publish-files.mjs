// Друкує параметри для Artifact publish: root, file_path і мапу files (усе з project/, крім завантажень assets/*.svg).
//
//   node list-publish-files.mjs            JSON для виклику Artifact (root + file_path + files)
//   node list-publish-files.mjs --assets   лише файли, які завантажуються як assets (asset: true)
//
// Індекс project/design-system.json іде ОСТАННІМ викликом; тому тут він виділений окремо (`index`).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = path.dirname(fileURLToPath(import.meta.url));
const project = path.join(base, "project");
const all = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else all.push(path.relative(base, p).replace(/\\/g, "/"));
  }
})(project);

const isUpload = (p) => /^project\/assets\/[^/]+\/.+\.(svg|png|jpe?g|gif|webp|mp4|webm|pdf)$/i.test(p);
const uploads = all.filter(isUpload).sort();
if (process.argv.includes("--assets")) {
  console.log(JSON.stringify({ url: "<url системи>", asset: true, file_paths: uploads.map((p) => path.join(base, p).replace(/\\/g, "/")) }, null, 2));
  process.exit(0);
}
const index = "project/design-system.json";
const files = all.filter((p) => !isUpload(p) && p !== index).sort();
const out = {
  root: base.replace(/\\/g, "/"),
  files_call: {
    file_path: path.join(base, "project/README.md").replace(/\\/g, "/"),
    files: Object.fromEntries(files.filter((p) => p !== "project/README.md").map((p) => [p, p])),
  },
  index_call: { file_path: path.join(base, index).replace(/\\/g, "/") },
  counts: { files: files.length, uploads: uploads.length },
};
console.log(JSON.stringify(out, null, 2));
