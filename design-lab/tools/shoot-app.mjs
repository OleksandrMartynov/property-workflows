// usage: node shoot-app.mjs <url> <light|dark> <outfile.png> [W=1440] [H=900] [fullpage=0]
// env: COOKIES=<json file with [{name,value}]>, JS=<expression to eval before shot>, WAIT=ms
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

const [url, theme = "light", out, W = "1440", H = "900", full = "0"] = process.argv.slice(2);
mkdirSync(dirname(out), { recursive: true });
const port = 9300 + Math.floor(Math.random() * 600);
const prof = `D:/tmp/ds-shots/profile-app-${port}`;
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`,
  "--hide-scrollbars", "--force-color-profile=srgb", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "about:blank",
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
  if (d.method === "Runtime.consoleAPICalled" && (d.params.type === "error" || d.params.type === "warning")) console.log("CONSOLE ERR", JSON.stringify(d.params.args).slice(0, 300));
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Network.enable");
if (process.env.COOKIES) {
  for (const c of JSON.parse(readFileSync(process.env.COOKIES, "utf8"))) {
    await send("Network.setCookie", { name: c.name, value: c.value, url: new URL(url).origin, path: "/" });
  }
}
await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: +(process.env.DSF || 1), mobile: +W < 600 });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }, ...(process.env.REDUCE ? [{ name: "prefers-reduced-motion", value: "reduce" }] : [])] });
await send("Page.enable"); await send("Runtime.enable");
await send("Page.navigate", { url });
await sleep(+(process.env.WAIT || 3500));
if (process.env.JS) { const r = await send("Runtime.evaluate", { expression: process.env.JS, awaitPromise: true, returnByValue: true }); console.log("js:", JSON.stringify(r.result?.result?.value ?? r.result).slice(0, 300)); await sleep(900); }
const loc = (await send("Runtime.evaluate", { expression: "location.pathname + location.search", returnByValue: true })).result.result.value;
let params = { format: "png" };
if (full === "1") {
  const h = (await send("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true })).result.result.value;
  params = { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: +W, height: Math.min(h, 3000), scale: 1 } };
}
const shot = await send("Page.captureScreenshot", params);
writeFileSync(out, Buffer.from(shot.result.data, "base64"));
console.log("saved", out, "at", loc);
ws.close(); chrome.kill();
