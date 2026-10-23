// usage: node shoot.mjs <path-on-ds-server> <light|dark> <outname> [width=1440] [height=900] [scrollY|selector=0] [js]
// Headless Chrome screenshot of a page from the local ds server; prints console errors and page exceptions.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const [path = "index.html", theme = "light", out = "shot", W = "1440", H = "900", target = "0", js = ""] = process.argv.slice(2);
const dir = "D:/tmp/ds-shots";
mkdirSync(dir, { recursive: true });
const port = 9300 + Math.floor(Math.random() * 600);
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}/profile-${port}`,
  "--hide-scrollbars", "--force-color-profile=srgb", "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list;
for (let i = 0; i < 60; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (list.length) break; } catch {} await sleep(200); }
const page = list.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.method === "Runtime.exceptionThrown") console.log("EXCEPTION", JSON.stringify(d.params.exceptionDetails).slice(0, 400));
  if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") console.log("CONSOLE ERR", JSON.stringify(d.params.args).slice(0, 300));
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: 1, mobile: +W < 600 });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
await send("Page.enable"); await send("Runtime.enable");
await send("Page.navigate", { url: `http://127.0.0.1:4173/${path}` });
await sleep(2500);
if (js) { const r = await send("Runtime.evaluate", { expression: js, awaitPromise: true, returnByValue: true }); console.log("js:", JSON.stringify(r.result?.result?.value ?? r.result).slice(0, 500)); await sleep(1200); }
const y = isNaN(+target)
  ? (await send("Runtime.evaluate", { expression: `(()=>{const e=document.querySelector(${JSON.stringify(target)}); return e ? e.getBoundingClientRect().top + scrollY - 8 : 0})()`, returnByValue: true })).result.result.value
  : +target;
await send("Runtime.evaluate", { expression: `scrollTo(0, ${y})` });
await sleep(900);
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(`${dir}/${out}.png`, Buffer.from(shot.result.data, "base64"));
const h = await send("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true });
console.log("saved", `${dir}/${out}.png`, "y", y, "pageHeight", h.result.result.value);
ws.close(); chrome.kill();
