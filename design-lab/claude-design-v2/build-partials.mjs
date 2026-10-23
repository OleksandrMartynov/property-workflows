// Знімає previews-src/_partials/ctl-msg.css, ctl-choice.css, ctl-drop.css з реального src/components/ui/controls.css
// (повідомлення поля; чекбокс, радіо, перемикач, segmented, slider; file drop): вирізає @layer-обгортку й кореневі
// :root-блоки (їхні токени — у PRELUDE build-previews.mjs), `var(--radius)` → `var(--radius-sm)` (така назва в tokens.json);
// решта — без змін, тож прев'ю мають ті самі правила, що застосунок.
//
//   node build-partials.mjs [шлях/до/controls.css]
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = (p) => new URL(p, import.meta.url);
const SRC = process.argv[2] ?? here("../../src/components/ui/controls.css");
const OUT = (n) => here(`./previews-src/_partials/${n}.css`);
const css = fs.readFileSync(SRC, "utf8").replace(/\r\n/g, "\n");
const start = css.indexOf("@layer components {");
if (start < 0) throw new Error("немає @layer components у controls.css");
let body = css.slice(start + "@layer components {".length);
const end = body.lastIndexOf("}");
body = body.slice(0, end);
// відступ на один рівень менше
body = body.replace(/^  /gm, "").trim();
body = body.replace(/var\(--radius\)/g, "var(--radius-sm)");
const cut = (re) => {
  const m = re.exec(body);
  if (!m) throw new Error("немає розділу " + re);
  return body.lastIndexOf("/* ---", m.index);
};
const iCheck = cut(/Checkbox · radio · switch/);
const iDrop = cut(/File drop:/);
const parts = { "ctl-msg": body.slice(0, iCheck), "ctl-choice": body.slice(iCheck, iDrop), "ctl-drop": body.slice(iDrop) };
for (const [name, text] of Object.entries(parts)) {
  fs.writeFileSync(OUT(name), `/* Згенеровано build-partials.mjs з src/components/ui/controls.css (@layer components). Не редагуй руками. */
${text.trim()}
`);
  console.log(`${name}.css: ${(text.length / 1024).toFixed(1)} KB`);
}