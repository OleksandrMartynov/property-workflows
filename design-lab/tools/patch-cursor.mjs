// Замальовує курсор на знімку: кожен рядок патча заповнюється кольором пікселя зліва від нього (зберігає горизонтальні межі).
// usage: node patch-cursor.mjs in.png out.png x y w h
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const [inp, out, X, Y, W, H] = process.argv.slice(2);
const port = 9300 + Math.floor(Math.random() * 600);
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=D:/tmp/ds-shots/profile-patch-${port}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list;
for (let i = 0; i < 60; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (list.length) break; } catch {} await sleep(200); }
const ws = new WebSocket(list.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const b64 = readFileSync(inp).toString("base64");
const expr = `(async()=>{const img=new Image();img.src="data:image/png;base64,${b64}";await img.decode();const c=document.createElement("canvas");c.width=img.width;c.height=img.height;const g=c.getContext("2d",{willReadFrequently:true});g.drawImage(img,0,0);
const x=${X},y=${Y},w=${W},h=${H};for(let r=y;r<y+h;r++){const p=g.getImageData(Math.max(0,x-3),r,1,1).data;g.fillStyle="rgba("+p[0]+","+p[1]+","+p[2]+","+(p[3]/255)+")";g.fillRect(x,r,w,1);}
return c.toDataURL("image/png").split(",")[1];})()`;
const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
if (!r.result?.result?.value) { console.log("FAILED", JSON.stringify(r.result).slice(0, 300)); process.exit(1); }
writeFileSync(out, Buffer.from(r.result.result.value, "base64"));
console.log("patched", out);
ws.close(); chrome.kill();
