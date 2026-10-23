/* ==========================================================================
   Property Workflows — Overlays & feedback gallery  ·  v0.1
   Vanilla JS, no dependencies. Sections: core · builders · floats ·
   tooltip · menu · popover · dialog · palette · toaster · demos · init
   ========================================================================== */
(() => {
"use strict";

/* ------------------------------ core ------------------------------------ */
const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
};
const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
const motionOK = () => root.dataset.motion === "full" || (root.dataset.motion !== "reduce" && !reduceMQ.matches);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let uidN = 0;
const nid = (p = "pw") => `${p}-${++uidN}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const tokenMs = (name) => { const v = getComputedStyle(root).getPropertyValue("--" + name).trim(); return v.endsWith("ms") ? parseFloat(v) : v.endsWith("s") ? parseFloat(v) * 1000 : parseFloat(v) || 0; };
const hasPopover = "popover" in HTMLElement.prototype;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");

/* Resolves on the element's own animationend (or after a safety timeout) */
function animDone(el, fallback = 420) {
  return new Promise((res) => {
    let done = false;
    const fin = () => { if (done) return; done = true; el.removeEventListener("animationend", h); clearTimeout(t); res(); };
    const h = (e) => { if (e.target === el) fin(); };
    el.addEventListener("animationend", h);
    const t = setTimeout(fin, fallback);
  });
}

/* ----------------------------- builders --------------------------------- */
const ic = (n, cls = "pw-icon") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const kbds = (arr, plain) => (arr && arr.length ? `<span class="pw-kbds${plain ? " pw-kbds--plain" : ""}">${arr.map((k) => `<kbd>${k}</kbd>`).join("")}</span>` : "");
const spinner = (size) => `<svg class="pw-spinner"${size ? ` data-size="${size}"` : ""} viewBox="0 0 16 16" aria-hidden="true"><circle class="track" cx="8" cy="8" r="6.5"/><circle class="arc" cx="8" cy="8" r="6.5" pathLength="1"/></svg>`;
const ring = (p, done) => `<svg class="pw-ring" viewBox="0 0 16 16" style="--p:${p}"${done ? " data-done" : ""} aria-hidden="true"><circle class="track" cx="8" cy="8" r="6.75"/><circle class="fill" cx="8" cy="8" r="6.75" pathLength="1"/></svg>`;
const badge = (status, label) => `<span class="pw-badge" data-status="${status}">${label}</span>`;
const avatar = (ch) => `<span class="pw-avatar" aria-hidden="true">${ch}</span>`;
const checkSvg = `<svg viewBox="0 0 12 12" aria-hidden="true"><path pathLength="1" d="M2.6 6.3l2.15 2.15L9.4 3.6"/></svg>`;

/* Button: v variant · s size (sm|md|lg) · iconOnly · loads (can show busy) */
function btn(o) {
  const a = [`class="pw-btn press"`, `data-variant="${o.v || "secondary"}"`];
  if (o.s && o.s !== "md") a.push(`data-size="${o.s}"`);
  if (o.iconOnly) a.push("data-icon-only");
  if (o.block) a.push("data-block");
  if (o.demo) a.push(`data-demo="${o.demo}"`);
  if (o.disabled) a.push(o.ariaDisabled ? `aria-disabled="true"` : "disabled");
  if (o.busy) a.push(`aria-busy="true"`);
  if (o.loads) a.push("data-loads");
  if (o.label && o.iconOnly) a.push(`aria-label="${esc(o.label)}"`);
  if (o.tip) a.push(`data-tooltip="${esc(o.tip)}"`);
  if (o.tipKbd) a.push(`data-kbd="${esc(o.tipKbd)}"`);
  if (o.attrs) a.push(o.attrs);
  a.push(`type="button"`);
  let inner;
  if (o.iconOnly) inner = `<span class="pw-btn__slot">${ic(o.icon)}${spinner()}</span>`;
  else if (o.icon && (o.busyLabel || o.loads)) inner = `<span class="pw-btn__slot">${ic(o.icon)}${spinner()}</span><span class="pw-btn__labels"><span data-idle>${o.label}</span><span data-busy>${o.busyLabel || o.label}</span></span>${kbds(o.kbd)}`;
  else if (o.loads || o.busy) inner = `<span class="pw-btn__label">${o.label}</span><span class="pw-btn__center">${spinner()}</span>${kbds(o.kbd)}`;
  else inner = `${o.icon ? ic(o.icon) : ""}<span class="pw-btn__label">${o.label}</span>${kbds(o.kbd)}${o.iconAfter ? ic(o.iconAfter) : ""}`;
  return `<button ${a.join(" ")}>${inner}</button>`;
}
const iconBtn = (icon, label, o = {}) => btn({ v: "ghost", s: "sm", iconOnly: true, icon, label, ...o });

const FAKE_ROWS = [
  ["Apartment 12, move-in", "progress", "In progress", 0.8],
  ["House 3, inspection", "due-soon", "Due soon", 0.17],
  ["Apartment 7, move-out", "completed", "Completed", 1],
  ["Tenant move-in", "todo", "To do", 0],
  ["Apartment 5, repair", "overdue", "Overdue", 0.4],
  ["House 8, inspection", "progress", "In progress", 0.5],
  ["Apartment 2, move-in", "todo", "To do", 0]
];
const fakeRows = (n = 7) => `<div class="g-fake-rows" aria-hidden="true">${FAKE_ROWS.slice(0, n).map(([t, s, l, p]) => `<div>${ring(p, p === 1)}<span class="grow t-truncate" style="color:var(--foreground)">${t}</span>${badge(s, l)}</div>`).join("")}</div>`;

/* ------------------------- theme / motion segs -------------------------- */
function placeThumb(seg, animate) {
  const on = $('[aria-checked="true"]', seg), th = $(".seg-thumb", seg);
  if (!on || !th) return;
  if (!animate) th.style.transition = "none";
  th.style.width = on.offsetWidth + "px"; th.style.transform = `translateX(${on.offsetLeft}px)`;
  if (!animate) { void th.offsetWidth; th.style.transition = ""; }
}
function setupSeg(seg, current, onChange) {
  const btns = $$('[role="radio"]', seg);
  const select = (b, focus) => { btns.forEach((x) => { x.setAttribute("aria-checked", String(x === b)); x.tabIndex = x === b ? 0 : -1; }); placeThumb(seg, true); if (focus) b.focus(); onChange(b.dataset.value); };
  btns.forEach((b) => { const on = b.dataset.value === current; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
  seg.addEventListener("click", (e) => { const b = e.target.closest('[role="radio"]'); if (b) select(b); });
  seg.addEventListener("keydown", (e) => {
    const i = btns.indexOf(document.activeElement); if (i < 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); select(btns[(i + 1) % btns.length], true); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); select(btns[(i - 1 + btns.length) % btns.length], true); }
  });
  placeThumb(seg, false);
}

/* ------------------------------ floats ----------------------------------
   Top-layer (popover="manual") elements placed against a trigger rect with
   collision flipping. State lives in data-state: open | closing. */
const VP = 8;
const open = new Set();               // currently open floats: { el, trigger, close(), opts }
function place(el, trg, o = {}) {
  const { side = "bottom", align = "start", gap = 6, alignOffset = 0 } = o;
  const t = trg.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight, vw = document.documentElement.clientWidth, vh = innerHeight;
  let s = side;
  const fits = { bottom: t.bottom + gap + h <= vh - VP, top: t.top - gap - h >= VP, right: t.right + gap + w <= vw - VP, left: t.left - gap - w >= VP };
  const opp = { bottom: "top", top: "bottom", right: "left", left: "right" }[s];
  if (!fits[s] && fits[opp]) s = opp;
  let x, y;
  if (s === "bottom" || s === "top") {
    y = s === "bottom" ? t.bottom + gap : t.top - gap - h;
    x = align === "end" ? t.right - w - alignOffset : align === "center" ? t.left + t.width / 2 - w / 2 : t.left + alignOffset;
  } else {
    x = s === "right" ? t.right + gap : t.left - gap - w;
    y = align === "end" ? t.bottom - h - alignOffset : align === "center" ? t.top + t.height / 2 - h / 2 : t.top + alignOffset;
  }
  x = clamp(x, VP, Math.max(VP, vw - w - VP)); y = clamp(y, VP, Math.max(VP, vh - h - VP));
  el.style.left = Math.round(x) + "px"; el.style.top = Math.round(y) + "px";
  el.dataset.side = s;
  const cx = t.left + t.width / 2 - x, cy = t.top + t.height / 2 - y;
  const ox = s === "right" ? 0 : s === "left" ? w : clamp(cx, 0, w), oy = s === "bottom" ? 0 : s === "top" ? h : clamp(cy, 0, h);
  el.style.setProperty("--origin", `${Math.round(ox)}px ${Math.round(oy)}px`);
  el.style.setProperty("--dx", s === "right" ? -1 : s === "left" ? 1 : 0);
  el.style.setProperty("--dy", s === "bottom" ? -1 : s === "top" ? 1 : 0);
  el.style.setProperty("--ax", clamp(cx, 16, w - 16) + "px");
}
function showFloat(el, trg, o) {
  clearTimeout(el._ct);
  el.dataset.state = "";
  if (hasPopover) { if (!el.matches(":popover-open")) el.showPopover(); } else el.hidden = false;
  place(el, trg, o);
  el._place = () => place(el, trg, o);
  void el.offsetWidth;
  el.dataset.state = "open";
}
function hideFloat(el, ms = 260) {
  if (!el.dataset.state || el.dataset.state === "closing") return Promise.resolve();
  el.dataset.state = "closing";
  return animDone(el, ms).then(() => {
    if (el.dataset.state !== "closing") return;
    if (hasPopover) { try { el.hidePopover(); } catch (e) {} } else el.hidden = true;
    el.dataset.state = ""; el._place = null;
  });
}
let rafPlace = 0;
const replaceAll = () => { cancelAnimationFrame(rafPlace); rafPlace = requestAnimationFrame(() => open.forEach((f) => f.el._place && f.el.dataset.state === "open" && f.el._place())); };
addEventListener("scroll", replaceAll, true);
addEventListener("resize", replaceAll);

/* Light dismiss + Esc for every registered open float */
document.addEventListener("pointerdown", (e) => {
  if (!open.size) return;
  const inside = [...open].some((f) => f.el.contains(e.target) || f.trigger.contains(e.target));
  if (!inside) [...open].forEach((f) => f.close({ restore: false }));
}, true);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || !open.size) return;
  const last = [...open].pop();
  e.preventDefault(); e.stopPropagation();
  last.close({ restore: true });
}, true);
document.addEventListener("focusin", (e) => {
  [...open].forEach((f) => { if (f.kind === "popover" && !f.el.contains(e.target) && !f.trigger.contains(e.target)) f.close({ restore: false }); });
});

/* ------------------------------ tooltip --------------------------------- */
const tips = new Map();
let tipTimer = 0, tipTrg = null, tipClosedAt = 0;
function tipEl(scope) {
  let t = tips.get(scope);
  if (!t) {
    t = document.createElement("div"); t.className = "pw-tooltip"; t.id = nid("tip"); t.setAttribute("role", "tooltip");
    if (hasPopover) t.setAttribute("popover", "manual"); else t.hidden = true;
    scope.appendChild(t); tips.set(scope, t);
  }
  return t;
}
function showTip(trg) {
  const scope = trg.closest("[data-theme]") || document.body;
  const t = tipEl(scope);
  const instant = Date.now() - tipClosedAt < tokenMs("tooltip-skip");
  clearTimeout(t._ct);
  t.innerHTML = `<span>${esc(trg.dataset.tooltip)}</span>${trg.dataset.kbd ? kbds(trg.dataset.kbd.split(" ")) : ""}`;
  if (instant) t.setAttribute("data-instant", ""); else t.removeAttribute("data-instant");
  t.dataset.state = "";
  if (hasPopover) { if (!t.matches(":popover-open")) t.showPopover(); } else t.hidden = false;
  place(t, trg, { side: trg.dataset.tipSide || "top", align: "center", gap: 6 });
  void t.offsetWidth; t.dataset.state = "open";
  trg.setAttribute("aria-describedby", t.id); tipTrg = trg; t._trg = trg;
}
function hideTip(immediate) {
  clearTimeout(tipTimer);
  if (!tipTrg) return;
  const trg = tipTrg; tipTrg = null; tipClosedAt = Date.now();
  trg.removeAttribute("aria-describedby");
  tips.forEach((t) => {
    if (t._trg !== trg || !t.dataset.state) return;
    if (immediate) { if (hasPopover) { try { t.hidePopover(); } catch (e) {} } else t.hidden = true; t.dataset.state = ""; return; }
    hideFloat(t, 160);
  });
}
function tipTarget(e) { return e.target.closest ? e.target.closest("[data-tooltip]") : null; }
document.addEventListener("pointerover", (e) => {
  const trg = tipTarget(e); if (!trg || trg === tipTrg || (e.pointerType === "touch")) return;
  if (trg.matches("[aria-expanded='true']")) return;
  clearTimeout(tipTimer); if (tipTrg && tipTrg !== trg) hideTip(true);
  const wait = Date.now() - tipClosedAt < tokenMs("tooltip-skip") ? 0 : tokenMs("tooltip-delay");
  if (wait === 0) showTip(trg); else tipTimer = setTimeout(() => showTip(trg), wait);
});
document.addEventListener("pointerout", (e) => { const trg = tipTarget(e); if (!trg || trg.contains(e.relatedTarget)) return; if (tipTrg === trg) hideTip(); else clearTimeout(tipTimer); });
document.addEventListener("focusin", (e) => {
  const trg = tipTarget(e); if (!trg || !e.target.matches(":focus-visible")) return;
  clearTimeout(tipTimer); const wait = Date.now() - tipClosedAt < tokenMs("tooltip-skip") ? 0 : tokenMs("tooltip-delay");
  tipTimer = setTimeout(() => showTip(trg), wait);
});
document.addEventListener("focusout", (e) => { const trg = tipTarget(e); if (trg) { if (tipTrg === trg) hideTip(); else clearTimeout(tipTimer); } });
document.addEventListener("pointerdown", () => hideTip(true), true);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTip(); }, true);
addEventListener("scroll", () => hideTip(true), true);

/* ------------------------- float controller ----------------------------- */
function floatCtl(el, trigger, kind, placeOpts, parent) {
  const ctl = { el, trigger, kind, parent: parent || null, isOpen: false, sub: null, subItem: null, onOpen: null, onClose: null };
  ctl.open = (focus) => {
    if (ctl.isOpen) return;
    ctl.isOpen = true; open.add(ctl);
    ctl.trigger.setAttribute("aria-expanded", "true");
    showFloat(el, ctl.trigger, typeof placeOpts === "function" ? placeOpts() : placeOpts);
    ctl.onOpen && ctl.onOpen(focus);
  };
  ctl.close = (c = {}) => {
    if (!ctl.isOpen) return;
    ctl.isOpen = false; open.delete(ctl);
    ctl.sub && ctl.sub.close({ restore: false });
    ctl.trigger.setAttribute("aria-expanded", "false");
    hideFloat(el);
    ctl.onClose && ctl.onClose();
    if (c.restore) ctl.trigger.focus({ preventScroll: true });
  };
  ctl.root = () => (ctl.parent ? ctl.parent.root() : ctl);
  return ctl;
}

/* -------------------------------- menu ----------------------------------- */
const TASK_MENU = [
  { g: "Task", items: [
    { id: "done", label: "Mark as done", icon: "ok", kbd: ["⌘", "↵"] },
    { id: "assign", label: "Assign…", icon: "user-plus", kbd: ["A"] },
    { id: "edit", label: "Edit details", icon: "pencil", kbd: ["E"] },
    { id: "status", label: "Status", icon: "flag", sub: "status" }
  ] },
  { sep: 1 },
  { g: "View", items: [
    { id: "v-completed", label: "Show completed", check: "checkbox", checked: true },
    { id: "v-optional", label: "Show optional tasks", check: "checkbox", checked: false }
  ] },
  { sep: 1 },
  { items: [{ id: "copy", label: "Copy link", icon: "link", kbd: ["⌘", "L"] }] },
  { sep: 1 },
  { items: [{ id: "delete", label: "Delete task", icon: "trash", kbd: ["⌘", "⌫"], variant: "destructive" }] }
];
const STATUS_MENU = [{ items: [
  { id: "s-todo", label: "To do", check: "radio", checked: false },
  { id: "s-progress", label: "In progress", check: "radio", checked: true },
  { id: "s-done", label: "Done", check: "radio", checked: false }
] }];

function menuItemHTML(it, i, st) {
  const role = it.check === "checkbox" ? "menuitemcheckbox" : it.check === "radio" ? "menuitemradio" : "menuitem";
  const a = [`class="pw-menu__item"`, `style="--i:${i}"`];
  if (!st) a.push(`role="${role}"`, `tabindex="-1"`, `type="button"`, `data-id="${it.id || ""}"`);
  if (it.check) a.push(`aria-checked="${!!it.checked}"`);
  if (it.sub) a.push(`aria-haspopup="menu"`, `aria-expanded="${st && it.expanded ? "true" : "false"}"`, `data-sub="${it.sub}"`);
  if (it.variant) a.push(`data-variant="${it.variant}"`);
  if (st && it.hl) a.push("data-highlighted");
  const lead = it.check
    ? `<span class="pw-menu__check"><svg viewBox="0 0 16 16" aria-hidden="true"><path pathLength="1" d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`
    : it.icon ? ic(it.icon) : "";
  const tag = st ? "div" : "button";
  return `<${tag} ${a.join(" ")}>${lead}<span class="pw-menu__label">${it.label}</span>${it.kbd ? kbds(it.kbd, true) : ""}${it.sub ? ic("chev", "pw-menu__chev") : ""}</${tag}>`;
}
function menuHTML(def, st) {
  let i = 0;
  return def.map((g) => {
    if (g.sep) return `<hr class="pw-menu__sep" role="separator">`;
    const items = g.items.map((it) => menuItemHTML(it, i++, st)).join("");
    if (!g.g) return items;
    const gid = nid("mg");
    return `<div role="group" aria-labelledby="${gid}"><div class="pw-menu__group-label" id="${gid}">${g.g}</div>${items}</div>`;
  }).join("");
}
function menuEl(def, label) {
  const el = document.createElement("div");
  el.className = "pw-float pw-menu"; el.id = nid("menu"); el.setAttribute("role", "menu"); el.setAttribute("aria-label", label); el.tabIndex = -1;
  if (hasPopover) el.setAttribute("popover", "manual"); else el.hidden = true;
  el.innerHTML = menuHTML(def, false);
  return el;
}

/* Wires a menu element to its trigger. `subs` maps data-sub keys to submenu elements. */
function bindMenu(el, trigger, o = {}, parent) {
  const ctl = floatCtl(el, trigger, "menu", parent ? { side: "right", align: "start", gap: 2, alignOffset: -4 } : () => ({ side: "bottom", align: o.align || "start", gap: 6 }), parent);
  const subs = {};
  Object.entries(o.subs || {}).forEach(([k, subEl]) => { subs[k] = bindMenu(subEl, null, { onSelect: o.onSelect }, ctl); });
  const items = () => $$('[role^="menuitem"]:not([aria-disabled="true"])', el);
  const focusItem = (it) => { if (it) it.focus({ preventScroll: true }); };
  let subT = 0, typed = "", typedT = 0;

  const openSub = (it, focus) => {
    const sub = subs[it.dataset.sub]; if (!sub) return;
    if (ctl.sub && ctl.sub !== sub) ctl.sub.close({ restore: false });
    if (ctl.subItem && ctl.subItem !== it) ctl.subItem.setAttribute("aria-expanded", "false");
    ctl.sub = sub; ctl.subItem = it; sub.trigger = it;
    it.setAttribute("aria-expanded", "true");
    sub.open(focus);
  };
  ctl.onOpen = (focus) => {
    $$('[role^="menuitem"]', el).forEach((it, i) => it.style.setProperty("--i", i));
    delete el.dataset.pointer;
    requestAnimationFrame(() => {
      const its = items();
      if (focus === "first") focusItem(its[0]);
      else if (focus === "last") focusItem(its[its.length - 1]);
      else { el.dataset.pointer = ""; el.focus({ preventScroll: true }); }
    });
  };
  ctl.onClose = () => { clearTimeout(subT); if (ctl.subItem) ctl.subItem.setAttribute("aria-expanded", "false"); };
  ctl.subs = subs;

  el.addEventListener("keydown", (e) => {
    const its = items(), cur = e.target.closest ? e.target.closest('[role^="menuitem"]') : null, i = its.indexOf(cur), n = its.length;
    delete el.dataset.pointer;
    const go = (idx) => { e.preventDefault(); focusItem(its[(idx + n) % n]); };
    switch (e.key) {
      case "ArrowDown": return go(i < 0 ? 0 : i + 1);
      case "ArrowUp": return go(i < 0 ? n - 1 : i - 1);
      case "Home": return go(0);
      case "End": return go(n - 1);
      case "ArrowRight": if (cur && cur.dataset.sub) { e.preventDefault(); openSub(cur, "first"); } return;
      case "ArrowLeft": if (ctl.parent) { e.preventDefault(); ctl.close({ restore: true }); } return;
      case "Tab": ctl.root().close({ restore: false }); return;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== " ") {
          typed += e.key.toLowerCase(); clearTimeout(typedT); typedT = setTimeout(() => (typed = ""), 600);
          const from = typed.length > 1 ? Math.max(i, 0) : i + 1;
          const hit = [...its.slice(from), ...its.slice(0, from)].find((x) => x.textContent.trim().toLowerCase().startsWith(typed));
          if (hit) { e.preventDefault(); focusItem(hit); }
        }
    }
  });
  el.addEventListener("pointermove", (e) => {
    const it = e.target.closest ? e.target.closest('[role^="menuitem"]') : null;
    el.dataset.pointer = "";
    if (!it || it.getAttribute("aria-disabled") === "true") return;
    if (document.activeElement !== it) focusItem(it);
    clearTimeout(subT);
    if (it.dataset.sub) { if (!(ctl.sub && ctl.sub.isOpen && ctl.subItem === it)) subT = setTimeout(() => openSub(it, "menu"), tokenMs("submenu-delay")); }
    else if (ctl.sub && ctl.sub.isOpen) subT = setTimeout(() => ctl.sub.close({ restore: false }), tokenMs("submenu-delay"));
  });
  el.addEventListener("pointerleave", () => { clearTimeout(subT); if (!(ctl.sub && ctl.sub.isOpen) && ctl.isOpen) el.focus({ preventScroll: true }); });
  el.addEventListener("click", (e) => {
    const it = e.target.closest ? e.target.closest('[role^="menuitem"]') : null;
    if (!it || !el.contains(it) || it.getAttribute("aria-disabled") === "true") return;
    if (it.dataset.sub) { openSub(it, e.detail === 0 ? "first" : "menu"); return; }
    const role = it.getAttribute("role");
    if (role === "menuitemcheckbox") { it.setAttribute("aria-checked", String(it.getAttribute("aria-checked") !== "true")); o.onSelect && o.onSelect(it.dataset.id, it); return; }
    if (role === "menuitemradio") { $$('[role="menuitemradio"]', it.closest('[role="group"]') || el).forEach((r) => r.setAttribute("aria-checked", String(r === it))); }
    o.onSelect && o.onSelect(it.dataset.id, it);
    ctl.root().close({ restore: true });
  });

  if (trigger) {
    trigger.setAttribute("aria-haspopup", "menu"); trigger.setAttribute("aria-expanded", "false"); trigger.setAttribute("aria-controls", el.id);
    trigger.addEventListener("click", (e) => { ctl.isOpen ? ctl.close({ restore: false }) : ctl.open(e.detail === 0 ? "first" : "menu"); });
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); ctl.open("first"); }
      else if (e.key === "ArrowUp") { e.preventDefault(); ctl.open("last"); }
    });
  }
  return ctl;
}

/* ------------------------------- popover --------------------------------- */
function popoverHTML(id, arrow) {
  return `${arrow ? '<span class="pw-popover__arrow" aria-hidden="true"></span>' : ""}
    <div class="pw-popover__head">${ring(0.8)}<div class="stack gap-0" style="min-width:0"><span class="pw-popover__title t-truncate"${id ? ` id="${id}-t"` : ""}>Apartment 12, move-in</span><span class="pw-popover__meta">Tenant move-in · 4 of 5 done</span></div></div>
    <dl class="pw-popover__rows"><dt>Status</dt><dd>${badge("progress", "In progress")}</dd><dt>Assignee</dt><dd>${avatar("A")}<span class="t-truncate">alex@example.test</span></dd><dt>Due</dt><dd>${badge("due-soon", "Due 24 Oct")}</dd><dt>Next</dt><dd class="t-truncate">Hand over the keys</dd></dl>
    <div class="pw-popover__foot">${btn({ v: "ghost", s: "sm", label: "Copy link", icon: "link" })}${btn({ v: "primary", s: "sm", label: "Open run", iconAfter: "arrow-right" })}</div>`;
}
function bindPopover(el, trigger, o = {}) {
  const ctl = floatCtl(el, trigger, "popover", { side: "bottom", align: "start", gap: o.arrow ? 10 : 6 });
  ctl.onOpen = (focus) => { if (focus === "first") requestAnimationFrame(() => { const f = $("button", el); f && f.focus({ preventScroll: true }); }); };
  trigger.setAttribute("aria-haspopup", "dialog"); trigger.setAttribute("aria-expanded", "false"); trigger.setAttribute("aria-controls", el.id);
  trigger.addEventListener("click", (e) => { ctl.isOpen ? ctl.close({ restore: false }) : ctl.open(e.detail === 0 ? "first" : "pointer"); });
  el.addEventListener("click", (e) => { if (e.target.closest(".pw-popover__foot .pw-btn")) ctl.close({ restore: true }); });
  return ctl;
}

/* ------------------------------- dialog ---------------------------------- */
function openDialog(dlg, trg) {
  dlg._trg = trg || document.activeElement;
  dlg.dataset.state = "";
  dlg.showModal();
  const f = $("[data-autofocus]", dlg) || $("button:not([disabled]), input", dlg);
  f && f.focus({ preventScroll: true });
}
function closeDialog(dlg) {
  if (!dlg.open || dlg.dataset.state === "closing") return Promise.resolve();
  dlg.dataset.state = "closing";
  return animDone(dlg, tokenMs("duration-moderate") * 0.7 + 50).then(() => {
    dlg.close(); dlg.dataset.state = "";
    const t = dlg._trg; if (t && t.isConnected && t.focus) t.focus({ preventScroll: true });
    dlg.dispatchEvent(new CustomEvent("pw-closed"));
  });
}
function nudge(dlg) {
  if (!motionOK()) return;
  const easing = getComputedStyle(root).getPropertyValue("--spring-snappy").trim() || "ease-out";
  dlg.animate([{ transform: "scale(1)" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }], { duration: 300, easing });
}
function wireDialog(dlg, o = {}) {
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); closeDialog(dlg); });
  dlg.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) { closeDialog(dlg); return; }
    const r = dlg.getBoundingClientRect();
    const box = $(".pw-palette__panel", dlg) ? $(".pw-palette__panel", dlg).getBoundingClientRect() : r;
    const out = e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom;
    if (out && e.target === dlg) o.alert ? nudge(dlg) : closeDialog(dlg);
  });
  dlg.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { const p = $("[data-confirm]", dlg); if (p && p.getAttribute("aria-disabled") !== "true") { e.preventDefault(); p.click(); } }
  });
}
const dlgConfirmHTML = (id) => `
  <div class="pw-dialog__body">
    <div class="pw-dialog__eyebrow">${ic("key")}<span>Last required task</span></div>
    <h2 class="pw-dialog__title"${id ? ` id="${id}-t"` : ""}>Hand over the keys</h2>
    <p class="pw-dialog__desc"${id ? ` id="${id}-d"` : ""}>Marking this task as done completes the run. This cannot be undone.</p>
    <div class="pw-dialog__context">${ring(0.8)}<span class="grow t-truncate">Apartment 12, move-in</span><span class="num">4 of 5 done</span></div>
  </div>
  <div class="pw-dialog__footer">
    <span class="start"><kbd>Esc</kbd> to cancel</span>
    ${btn({ v: "outline", label: "Cancel", attrs: "data-close data-autofocus" })}
    ${btn({ v: "primary", label: "Mark as done", icon: "ok", busyLabel: "Marking…", loads: true, kbd: ["⌘", "↵"], attrs: "data-confirm" })}
  </div>`;
const dlgDeleteHTML = (id) => `
  <div class="pw-dialog__body">
    <span class="pw-dialog__media">${ic("trash", "")}</span>
    <h2 class="pw-dialog__title"${id ? ` id="${id}-t"` : ""}>Delete “Apartment 12, move-in”?</h2>
    <p class="pw-dialog__desc"${id ? ` id="${id}-d"` : ""}>This permanently removes the run and its 5 tasks. This cannot be undone.</p>
    <div class="pw-dialog__field">
      <label class="pw-label"${id ? ` for="${id}-i"` : ""}>Type <b>Apartment 12, move-in</b> to confirm</label>
      <input class="pw-input"${id ? ` id="${id}-i"` : ""} autocomplete="off" spellcheck="false" placeholder="Apartment 12, move-in">
    </div>
  </div>
  <div class="pw-dialog__footer">
    ${btn({ v: "outline", label: "Cancel", attrs: "data-close data-autofocus" })}
    ${btn({ v: "destructive", label: "Delete run", icon: "trash", busyLabel: "Deleting…", loads: true, disabled: true, ariaDisabled: true, attrs: "data-confirm" })}
  </div>`;
function mkDialog(kind, alert) {
  const d = document.createElement("dialog"); const id = nid("dlg");
  d.className = "pw-dialog"; d.dataset.kind = kind; if (alert) d.setAttribute("role", "alertdialog");
  d.setAttribute("aria-labelledby", id + "-t"); d.setAttribute("aria-describedby", id + "-d");
  d.innerHTML = (kind === "confirm" ? dlgConfirmHTML(id) : dlgDeleteHTML(id)) + `<span class="pw-dialog__close">${iconBtn("x", "Close", { attrs: "data-close", tip: "Close", tipKbd: "Esc" })}</span>`;
  return d;
}
function initDialogs(host, scope) {
  const dc = mkDialog("confirm", false), dd = mkDialog("delete", true);
  host.append(dc, dd);
  wireDialog(dc); wireDialog(dd, { alert: true });
  $$("[data-open-dialog]", scope).forEach((b) => b.addEventListener("click", () => openDialog(b.dataset.openDialog === "confirm" ? dc : dd, b)));
  const cb = $("[data-confirm]", dc);
  cb.addEventListener("click", async () => {
    if (cb.getAttribute("aria-busy") === "true") return;
    cb.setAttribute("aria-busy", "true"); await sleep(900); cb.removeAttribute("aria-busy");
    await closeDialog(dc);
    Toast.add({ tone: "success", title: "Run completed", desc: "Apartment 12, move-in · 5 of 5 done" });
  });
  const inp = $("input", dd), db = $("[data-confirm]", dd), want = "Apartment 12, move-in";
  const sync = () => db.setAttribute("aria-disabled", String(inp.value.trim() !== want));
  inp.addEventListener("input", sync);
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); db.click(); } });
  db.addEventListener("click", async () => {
    if (db.getAttribute("aria-disabled") === "true") { inp.focus(); nudge(dd); return; }
    if (db.getAttribute("aria-busy") === "true") return;
    db.setAttribute("aria-busy", "true"); await sleep(900); db.removeAttribute("aria-busy");
    await closeDialog(dd);
    Toast.add({ tone: "neutral", icon: "trash", title: "Run deleted", desc: "Apartment 12, move-in", action: { label: "Undo" } });
  });
  dd.addEventListener("pw-closed", () => { inp.value = ""; sync(); });
}

/* -------------------------------- sheet ---------------------------------- */
const sheetHTML = (id) => `
  <header class="pw-sheet__head">
    <div class="pw-sheet__crumbs"><span>Apartment 12, move-in</span>${ic("chev", "")}<span>Handover</span></div>
    ${iconBtn("chev-up", "Previous task", { tip: "Previous task", tipKbd: "K" })}${iconBtn("chev-down", "Next task", { tip: "Next task", tipKbd: "J" })}
    ${iconBtn("x", "Close", { attrs: "data-close data-autofocus", tip: "Close", tipKbd: "Esc" })}
  </header>
  <div class="pw-sheet__body">
    <div class="stack gap-1"><h2 class="pw-sheet__title"${id ? ` id="${id}-t"` : ""}>Hand over the keys</h2><span class="t-meta t-muted">Required task · 5 of 5</span></div>
    <dl class="pw-sheet__props">
      <dt>Status</dt><dd>${badge("progress", "In progress")}</dd>
      <dt>Assignee</dt><dd>${avatar("A")}<span class="t-truncate">alex@example.test</span></dd>
      <dt>Due</dt><dd>${badge("due-soon", "Due 24 Oct")}</dd>
      <dt>Section</dt><dd>Handover</dd>
    </dl>
    <div class="pw-sheet__section"><h3>Description</h3><p>Hand both key sets to <span class="pw-var">{{tenant_name}}</span> at <span class="pw-var">{{unit}}</span> and photograph the signed key receipt.</p></div>
    <div class="pw-sheet__section"><h3>Activity</h3>
      <div class="stack gap-2 t-meta" style="color:var(--muted-foreground)">
        <div class="cluster gap-2">${avatar("S")}<span><b style="color:var(--foreground);font-weight:var(--weight-medium)">sam@example.test</b> marked “Sign the handover form” as done</span></div>
        <div class="cluster gap-2">${avatar("A")}<span><b style="color:var(--foreground);font-weight:var(--weight-medium)">alex@example.test</b> was assigned this task</span></div>
      </div>
    </div>
  </div>
  <footer class="pw-sheet__foot">${btn({ v: "outline", label: "Assign…", icon: "user-plus" })}${btn({ v: "primary", label: "Mark as done", icon: "ok", kbd: ["⌘", "↵"] })}</footer>`;
function initSheet(host, scope) {
  const d = document.createElement("dialog"); const id = nid("sheet");
  d.className = "pw-sheet"; d.setAttribute("aria-labelledby", id + "-t"); d.innerHTML = sheetHTML(id);
  host.appendChild(d); wireDialog(d);
  $$("[data-open-sheet]", scope).forEach((b) => b.addEventListener("click", () => openDialog(d, b)));
  $('[aria-label="Previous task"]', d).addEventListener("click", () => Toast.add({ tone: "neutral", title: "Showing previous task", desc: "Sign the handover form" }));
  return d;
}

/* ------------------------- command palette ------------------------------- */
const PAL = {
  runs: [
    { id: "r1", kind: "run", title: "Apartment 12, move-in", sub: "Tenant move-in · 4 of 5 done" },
    { id: "r2", kind: "run", title: "House 3, inspection", sub: "Inspection · 1 of 6 done" },
    { id: "r3", kind: "run", title: "Apartment 7, move-out", sub: "Tenant move-out · Completed", done: true }
  ],
  templates: [
    { id: "t1", kind: "template", title: "Tenant move-in", sub: "3 sections · 12 tasks" },
    { id: "t2", kind: "template", title: "Tenant move-out", sub: "3 sections · 9 tasks" },
    { id: "t3", kind: "template", title: "Apartment repair", sub: "2 sections · 7 tasks" },
    { id: "t4", kind: "template", title: "Inspection", sub: "4 sections · 14 tasks" }
  ],
  actions: [
    { id: "a1", kind: "action", title: "Mark as done", sub: "Current task", kbd: ["⌘", "↵"] },
    { id: "a2", kind: "action", title: "Assign…", kbd: ["A"] },
    { id: "a3", kind: "action", title: "Insert variable…", sub: "{{tenant_name}}", kbd: ["⌘", "⇧", "V"] },
    { id: "a4", kind: "action", title: "Launch template…", kbd: ["L"] }
  ]
};
const KIND_ICON = { run: "runs", template: "template", action: "bolt" };
const KIND_TYPE = { run: "Run", template: "Template", action: "Action" };
const PRIMARY = { run: "Open run", template: "Launch template", action: "Run action" };
const ACTIONS_BY_KIND = {
  run: [
    { id: "open", label: "Open run", icon: "arrow-right", kbd: ["↵"] },
    { id: "next", label: "Mark next task as done", icon: "ok", kbd: ["⌘", "↵"] },
    { id: "assign", label: "Assign…", icon: "user-plus", kbd: ["A"] },
    { id: "copy", label: "Copy link", icon: "link", kbd: ["⌘", "L"] },
    { id: "delete", label: "Delete run", icon: "trash", kbd: ["⌘", "⌫"], variant: "destructive" }
  ],
  template: [
    { id: "launch", label: "Launch run", icon: "play", kbd: ["↵"] },
    { id: "edit", label: "Edit template", icon: "pencil", kbd: ["E"] },
    { id: "dup", label: "Duplicate", icon: "copy", kbd: ["⌘", "D"] },
    { id: "copy", label: "Copy link", icon: "link", kbd: ["⌘", "L"] },
    { id: "archive", label: "Archive template", icon: "archive", variant: "destructive" }
  ],
  action: [
    { id: "run", label: "Run action", icon: "bolt", kbd: ["↵"] },
    { id: "copyk", label: "Copy shortcut", icon: "copy" },
    { id: "pin", label: "Pin to top", icon: "flag" }
  ]
};
function fuzzy(q, text) {
  q = q.trim().toLowerCase(); if (!q) return null;
  const t = text.toLowerCase(), i = t.indexOf(q);
  if (i >= 0) return { score: 100 - i + (i === 0 ? 20 : 0) - (t.length - q.length) * 0.1, idx: Array.from({ length: q.length }, (_, k) => i + k) };
  let ti = 0; const idx = [];
  for (const ch of q) { if (ch === " ") continue; const j = t.indexOf(ch, ti); if (j < 0) return null; idx.push(j); ti = j + 1; }
  return idx.length ? { score: 40 - (idx[idx.length - 1] - idx[0]), idx } : null;
}
function hl(text, idx) {
  if (!idx || !idx.length) return esc(text);
  const set = new Set(idx); let out = "", on = false;
  for (let i = 0; i < text.length; i++) {
    const m = set.has(i);
    if (m && !on) { out += "<mark>"; on = true; } else if (!m && on) { out += "</mark>"; on = false; }
    out += esc(text[i]);
  }
  return on ? out + "</mark>" : out;
}
const paletteHTML = (id) => `
  <div class="pw-palette__panel">
    <div class="pw-palette__search">
      ${ic("search")}
      <input class="pw-palette__input" type="text" role="combobox" aria-expanded="true" aria-controls="${id}-list" aria-autocomplete="list" aria-label="Search runs, templates and actions" placeholder="Search runs, templates, actions…" autocomplete="off" spellcheck="false">
      ${kbds(["Esc"])}
    </div>
    <div class="pw-palette__progress" aria-hidden="true"></div>
    <div class="pw-palette__list" id="${id}-list" role="listbox" aria-label="Results"></div>
    <div class="pw-palette__footer">
      <span class="ctx" data-ctx></span>
      <span class="acts">
        <span data-primary></span>${kbds(["↵"])}<span class="vr" aria-hidden="true"></span>
        <button type="button" class="pw-palette__fbtn press" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-acts" data-act-toggle>Actions ${kbds(["⌘", "K"])}</button>
      </span>
    </div>
    <div class="pw-palette__actions" id="${id}-acts" hidden>
      <div class="pw-palette__actions-title" data-act-title></div>
      <div class="pw-palette__actions-list" role="listbox" aria-label="Actions for the selected item"></div>
      <input type="text" role="combobox" aria-expanded="true" aria-label="Search actions" placeholder="Search actions…" autocomplete="off" spellcheck="false">
    </div>
  </div>`;

function initPalette(rootEl, o = {}) {
  const input = $(".pw-palette__input", rootEl), list = $(".pw-palette__list", rootEl), ctx = $("[data-ctx]", rootEl), prim = $("[data-primary]", rootEl);
  const actPanel = $(".pw-palette__actions", rootEl), actList = $(".pw-palette__actions-list", rootEl), actInput = $("input", actPanel), actTitle = $("[data-act-title]", actPanel), actToggle = $("[data-act-toggle]", rootEl);
  const id = list.id;
  let q = "", flat = [], sel = 0, loading = false, actOpen = false, actItems = [], actSel = 0, enterT = 0;

  const build = () => {
    if (!q.trim()) return [
      { label: "Recent", items: [PAL.runs[0], PAL.templates[0], PAL.runs[1]].map((x) => ({ ...x })) },
      { label: "Actions", items: PAL.actions.map((x) => ({ ...x })) }
    ];
    const gs = [];
    [["Runs", PAL.runs], ["Templates", PAL.templates], ["Actions", PAL.actions]].forEach(([label, arr]) => {
      const hits = [];
      arr.forEach((it) => {
        const m = fuzzy(q, it.title);
        if (m) hits.push({ ...it, m, score: m.score });
        else if (q.trim().length > 1 && it.sub && fuzzy(q, it.sub)) hits.push({ ...it, m: null, score: -10 });
      });
      hits.sort((a, b) => b.score - a.score);
      if (hits.length) gs.push({ label, items: hits });
    });
    return gs;
  };
  const row = (it, i) => `<div class="pw-palette__item" role="option" id="${id}-o${i}" data-i="${i}" aria-selected="false" style="--i:${i}"><span class="pw-palette__icon" data-kind="${it.kind === "run" && it.done ? "run-done" : it.kind}">${ic(KIND_ICON[it.kind], "")}</span><span class="pw-palette__title">${hl(it.title, it.m && it.m.idx)}</span>${it.sub ? `<span class="pw-palette__sub">${esc(it.sub)}</span>` : ""}<span class="pw-palette__aside">${it.kbd ? kbds(it.kbd, true) : ""}<span class="pw-palette__type">${KIND_TYPE[it.kind]}</span><kbd class="pw-palette__enter" aria-hidden="true">↵</kbd></span></div>`;
  const emptyHTML = () => `<div class="pw-palette__empty" role="status"><svg class="art" viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="9.5"/><path d="M25 25l8 8M14.5 14.5l7 7M21.5 14.5l-7 7"/></g></svg><strong class="t-label">No results for “${esc(q.trim())}”</strong><p>Try the name of a run, a template or an action.</p>${btn({ v: "outline", s: "sm", label: "Clear search", attrs: "data-clear" })}</div>`;
  const skeleton = () => [62, 48, 70, 40, 56].map((w) => `<div class="pw-palette__sk"><span class="skeleton"></span><span class="skeleton" style="width:${w}%"></span></div>`).join("");

  function render(keepId, animate) {
    const groups = loading ? [] : build();
    flat = groups.flatMap((g) => g.items);
    list.setAttribute("aria-busy", String(loading));
    if (animate) { list.dataset.enter = ""; clearTimeout(enterT); enterT = setTimeout(() => delete list.dataset.enter, 500); }
    if (loading) { list.innerHTML = skeleton(); input.removeAttribute("aria-activedescendant"); footer(); return; }
    if (!flat.length) { list.innerHTML = emptyHTML(); input.removeAttribute("aria-activedescendant"); footer(); return; }
    let n = 0;
    list.innerHTML = groups.map((g, gi) => `<div class="pw-palette__group" role="group" aria-labelledby="${id}-g${gi}"><div class="pw-palette__heading" id="${id}-g${gi}">${g.label}</div>${g.items.map((it) => row(it, n++)).join("")}</div>`).join("");
    sel = keepId ? Math.max(0, flat.findIndex((x) => x.id === keepId)) : 0;
    list.scrollTop = 0; applySel(false);
  }
  function footer() {
    const it = flat[sel];
    ctx.innerHTML = it ? `${ic(KIND_ICON[it.kind], "")}<span>${esc(it.title)}</span>` : `<span>${loading ? "Searching…" : "No selection"}</span>`;
    prim.textContent = it ? PRIMARY[it.kind] : "";
    actToggle.toggleAttribute("aria-disabled", !it); if (!it) actToggle.setAttribute("aria-disabled", "true"); else actToggle.removeAttribute("aria-disabled");
  }
  function applySel(scroll) {
    const els = $$(".pw-palette__item", list);
    els.forEach((el, i) => el.setAttribute("aria-selected", String(i === sel)));
    const cur = els[sel];
    if (cur) { input.setAttribute("aria-activedescendant", cur.id); if (scroll) cur.scrollIntoView({ block: "nearest" }); }
    footer();
  }
  function setQ(v) { input.value = v; q = v; render(null, false); }

  /* actions panel */
  function renderActs() {
    const f = actInput.value.trim().toLowerCase();
    const it = flat[sel]; if (!it) return;
    actItems = ACTIONS_BY_KIND[it.kind].filter((a) => !f || a.label.toLowerCase().includes(f));
    actList.innerHTML = actItems.map((a, i) => `<div class="pw-menu__item" role="option" id="${id}-a${i}" data-i="${i}" aria-selected="false"${a.variant ? ` data-variant="${a.variant}"` : ""}>${ic(a.icon)}<span class="pw-menu__label">${a.label}</span>${a.kbd ? kbds(a.kbd, true) : ""}</div>`).join("") || `<div class="pw-palette__actions-title">No actions match</div>`;
    actSel = clamp(actSel, 0, Math.max(0, actItems.length - 1)); applyAct();
  }
  function applyAct() {
    $$(".pw-menu__item", actList).forEach((el, i) => el.setAttribute("aria-selected", String(i === actSel)));
    const cur = actList.children[actSel]; if (cur && actItems.length) actInput.setAttribute("aria-activedescendant", cur.id); else actInput.removeAttribute("aria-activedescendant");
  }
  function openActs() {
    const it = flat[sel]; if (!it || actOpen) return;
    actOpen = true; actSel = 0; actInput.value = ""; actTitle.textContent = it.title;
    actToggle.setAttribute("aria-expanded", "true"); input.setAttribute("aria-expanded", "false");
    actPanel.hidden = false; actPanel.dataset.state = "";
    renderActs(); void actPanel.offsetWidth; actPanel.dataset.state = "open"; actInput.focus({ preventScroll: true });
  }
  function closeActs(focus) {
    if (!actOpen) return;
    actOpen = false; actToggle.setAttribute("aria-expanded", "false"); input.setAttribute("aria-expanded", "true");
    actPanel.dataset.state = "closing";
    animDone(actPanel, 200).then(() => { if (!actOpen) { actPanel.hidden = true; actPanel.dataset.state = ""; } });
    if (focus) input.focus({ preventScroll: true });
  }
  const toggleActs = () => (actOpen ? closeActs(true) : openActs());

  function run(item, act) {
    const label = act ? act.label : PRIMARY[item.kind];
    if (o.modal) closeDialog(rootEl);
    else closeActs(false);
    if (act && (act.id === "next")) Toast.add({ tone: "success", title: "Task marked as done", desc: "Hand over the keys · " + item.title, action: { label: "Undo" }, progress: true });
    else if (act && act.id === "delete") Toast.add({ tone: "neutral", icon: "trash", title: "Run deleted", desc: item.title, action: { label: "Undo" }, progress: true });
    else if (act && /^copy/.test(act.id)) Toast.add({ tone: "info", title: act.id === "copyk" ? "Shortcut copied" : "Link copied", desc: item.title });
    else if (item.kind === "template" && !act) Toast.add({ tone: "info", title: "Launching a run", desc: item.title });
    else Toast.add({ tone: "neutral", icon: "check", title: label, desc: item.title });
  }

  input.addEventListener("input", () => { q = input.value; render(null, false); });
  actInput.addEventListener("input", () => { actSel = 0; renderActs(); });
  actToggle.addEventListener("click", toggleActs);
  prim.parentElement.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-act-toggle]")) e.preventDefault(); });
  rootEl.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); e.stopPropagation(); toggleActs(); return; }
    if (e.key === "Escape") {
      if (actOpen) { e.preventDefault(); e.stopPropagation(); closeActs(true); }
      else if (!o.modal && q) { e.preventDefault(); setQ(""); }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); const d = e.key === "ArrowDown" ? 1 : -1;
      if (actOpen) { if (actItems.length) { actSel = (actSel + d + actItems.length) % actItems.length; applyAct(); } }
      else if (flat.length) { sel = (sel + d + flat.length) % flat.length; applySel(true); }
      return;
    }
    if (e.key === "Enter" && !e.isComposing && !e.target.closest(".pw-palette__fbtn")) {
      if (e.target.closest("[data-clear]")) return;
      e.preventDefault();
      if (actOpen) { if (actItems[actSel]) run(flat[sel], actItems[actSel]); }
      else if (flat[sel]) run(flat[sel], null);
    }
  });
  list.addEventListener("pointerdown", (e) => { if (!e.target.closest("[data-clear]")) e.preventDefault(); });
  actList.addEventListener("pointerdown", (e) => e.preventDefault());
  list.addEventListener("pointermove", (e) => { const el = e.target.closest(".pw-palette__item"); if (!el) return; const i = +el.dataset.i; if (i !== sel) { sel = i; applySel(false); } });
  list.addEventListener("click", (e) => {
    if (e.target.closest("[data-clear]")) { setQ(""); input.focus(); return; }
    const el = e.target.closest(".pw-palette__item"); if (el) { sel = +el.dataset.i; run(flat[sel], null); }
  });
  actList.addEventListener("pointermove", (e) => { const el = e.target.closest(".pw-menu__item"); if (el && +el.dataset.i !== actSel) { actSel = +el.dataset.i; applyAct(); } });
  actList.addEventListener("click", (e) => { const el = e.target.closest(".pw-menu__item"); if (el) run(flat[sel], actItems[+el.dataset.i]); });

  const api = {
    reset() { closeActs(false); loading = false; delete rootEl.dataset.loading; q = ""; input.value = ""; render(null, true); },
    setQuery: setQ,
    setLoading(on) { loading = on; on ? (rootEl.dataset.loading = "") : delete rootEl.dataset.loading; render(null, !on); },
    async simulateLoading(ms = 1500) { api.setLoading(true); await sleep(ms); api.setLoading(false); },
    focus() { input.focus({ preventScroll: true }); }
  };
  render(null, true);
  return api;
}

/* ------------------------------- toaster ---------------------------------- */
const TOAST_ICON = { success: "ok", info: "info", error: "error", neutral: "check" };
const toastInner = (o) => `<span class="pw-toast__icon">${ic(o.icon || TOAST_ICON[o.tone || "neutral"])}</span>
  <div class="pw-toast__body"><span class="pw-toast__title">${esc(o.title)}</span>${o.desc ? `<span class="pw-toast__desc">${esc(o.desc)}</span>` : ""}</div>
  <div class="pw-toast__side">${o.action ? btn({ v: "secondary", s: "sm", label: esc(o.action.label), attrs: "data-toast-action" }) : ""}${iconBtn("x", "Dismiss notification", { attrs: "data-toast-close" })}</div>`;
const toastStatic = (o) => `<li class="pw-toast pw-toast--static" data-tone="${o.tone || "neutral"}">${toastInner(o)}${o.progress ? `<span class="pw-toast__progress" style="transform:scaleX(${o.progress})"></span>` : ""}</li>`;

const Toast = (() => {
  const el = document.createElement("div");
  el.className = "pw-toaster"; el.setAttribute("role", "region"); el.setAttribute("aria-label", "Notifications"); el.tabIndex = -1;
  if (hasPopover) el.setAttribute("popover", "manual");
  const ol = document.createElement("ol"); el.appendChild(ol);
  const items = []; let expanded = false, paused = false;
  const GAP = 8;
  const px = (n) => tokenMs(n);   // tokens such as --toast-peek are plain px numbers here
  const live = () => items.filter((t) => !t.leaving);

  function layout() {
    const L = live(), PEEK = px("toast-peek"), PS = px("toast-peek-scale");
    const hs = L.map((t) => t.el.offsetHeight);
    let acc = 0;
    L.forEach((t, i) => {
      const e = t.el; e.style.zIndex = String(10 - i);
      if (expanded || L.length === 1) {
        e.style.setProperty("--_y", `${-acc}px`); e.style.setProperty("--_s", "1"); e.style.setProperty("--_sy", "1"); acc += hs[i] + GAP; e.removeAttribute("data-hidden-behind");
      } else {
        e.style.setProperty("--_y", `${-i * PEEK}px`); e.style.setProperty("--_s", String(1 - i * PS)); e.style.setProperty("--_sy", String(hs[0] / hs[i]));
        i > 0 ? e.setAttribute("data-hidden-behind", "") : e.removeAttribute("data-hidden-behind");
      }
    });
    const H = !L.length ? 0 : expanded ? acc - GAP : hs[0] + (L.length - 1) * PEEK;
    el.style.setProperty("--_stack-h", `${H}px`);
  }
  const start = (t) => { if (t.tid || t.leaving || !t.dur) return; t.started = Date.now(); t.tid = setTimeout(() => dismiss(t), Math.max(60, t.remaining)); };
  function pauseAll() { if (paused) return; paused = true; el.dataset.paused = ""; items.forEach((t) => { if (t.tid) { clearTimeout(t.tid); t.tid = 0; t.remaining -= Date.now() - t.started; } }); }
  function resumeAll() { if (!paused) return; paused = false; delete el.dataset.paused; live().forEach(start); }
  function dismiss(t) {
    if (t.leaving) return;
    t.leaving = true; clearTimeout(t.tid); t.tid = 0;
    t.el.style.removeProperty("--_o");
    t.el.dataset.state = "leaving";
    if (!live().length) expanded = false;
    layout();
    setTimeout(() => { const i = items.indexOf(t); if (i >= 0) items.splice(i, 1); t.el.remove(); layout(); if (!items.length && paused) resumeAll(); }, tokenMs("duration-base") * 0.7 + 40);
  }
  function wire(t) {
    const li = t.el;
    li.addEventListener("click", (e) => {
      if (e.target.closest("[data-toast-action]")) { t.o.action && t.o.action.onClick && t.o.action.onClick(); dismiss(t); }
      else if (e.target.closest("[data-toast-close]")) dismiss(t);
    });
    li.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button") || e.button !== 0) return;
      const x0 = e.clientX; let dx = 0;
      li.setPointerCapture(e.pointerId); li.dataset.swiping = "";
      const move = (ev) => { dx = ev.clientX - x0; const d = dx > 0 ? dx : dx * 0.2; li.style.setProperty("--_x", d + "px"); li.style.setProperty("--_o", String(clamp(1 - Math.abs(d) / 240, 0.25, 1))); };
      const up = () => {
        li.removeEventListener("pointermove", move); li.removeEventListener("pointerup", up); li.removeEventListener("pointercancel", up);
        delete li.dataset.swiping;
        if (dx > px("swipe-threshold")) { li.style.setProperty("--_x", li.offsetWidth + 48 + "px"); dismiss(t); }
        else { li.style.setProperty("--_x", "0px"); li.style.removeProperty("--_o"); }
      };
      li.addEventListener("pointermove", move); li.addEventListener("pointerup", up); li.addEventListener("pointercancel", up);
    });
  }
  function add(o) {
    if (!el.isConnected) { document.body.appendChild(el); if (hasPopover) el.showPopover(); }
    const L = live();
    while (L.length >= 3) dismiss(L.pop());
    const dur = o.duration != null ? o.duration : o.progress ? tokenMs("toast-duration") : o.tone === "error" ? 8000 : 4500;
    const li = document.createElement("li");
    li.className = "pw-toast"; li.dataset.tone = o.tone || "neutral"; li.dataset.state = "entering";
    li.setAttribute("role", o.tone === "error" ? "alert" : "status");
    li.innerHTML = toastInner(o) + (o.progress ? `<span class="pw-toast__progress" data-run style="animation-duration:${dur}ms"></span>` : "");
    const t = { el: li, o, dur, remaining: dur, started: 0, tid: 0, leaving: false };
    items.unshift(t); ol.prepend(li);
    if (hasPopover && document.querySelector("dialog[open]")) { try { el.hidePopover(); el.showPopover(); } catch (e) {} }
    void li.offsetWidth; li.removeAttribute("data-state");
    layout(); if (!paused) start(t);
    wire(t);
    return t;
  }
  el.addEventListener("pointerenter", () => { expanded = true; pauseAll(); layout(); });
  el.addEventListener("pointerleave", () => { expanded = el.matches(":focus-within"); layout(); if (!expanded) resumeAll(); });
  el.addEventListener("focusin", () => { expanded = true; pauseAll(); layout(); });
  el.addEventListener("focusout", (e) => { if (el.contains(e.relatedTarget)) return; expanded = el.matches(":hover"); layout(); if (!expanded) resumeAll(); });
  document.body.appendChild(el); if (hasPopover) el.showPopover();
  return { add, dismissAll: () => live().forEach(dismiss), el };
})();

/* ------------------------- gallery panels (light + dark) ------------------- */
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const DUO = {};

/* -- Buttons -- */
const VARS = ["primary", "secondary", "outline", "ghost", "destructive", "link"];
const VL = { primary: "Mark as done", secondary: "Save draft", outline: "Cancel", ghost: "Skip task", destructive: "Delete run", link: "View details" };
const BUSY = { primary: "Marking…", secondary: "Saving…", outline: "Cancelling…", ghost: "Skipping…", destructive: "Deleting…" };
const VICON = { primary: "ok", secondary: "copy", outline: "plus", ghost: "user-plus", destructive: "trash", link: "arrow-right" };
const VKBD = { primary: ["⌘", "↵"], secondary: ["⌘", "S"], outline: ["Esc"], ghost: ["S"], destructive: ["⌫"] };
DUO.buttons = {
  stack: true,
  body() {
    const rows = [
      ["Default", (v) => btn({ v, label: VL[v] })],
      ["Hover", (v) => btn({ v, label: VL[v], demo: "hover" })],
      ["Focus", (v) => btn({ v, label: VL[v], demo: "focus" })],
      ["Pressed", (v) => btn({ v, label: VL[v], demo: "active" })],
      ["Disabled", (v) => btn({ v, label: VL[v], disabled: true })],
      ["Loading", (v) => (v === "link" ? btn({ v, label: VL[v], busy: true, loads: true }) : btn({ v, label: VL[v], icon: VICON[v], busyLabel: BUSY[v], busy: true, loads: true }))],
      ["With icon", (v) => btn({ v, label: VL[v], icon: VICON[v] })],
      ["With kbd", (v) => (v === "link" ? "" : btn({ v, label: VL[v], kbd: VKBD[v] }))]
    ];
    const grid = `<div class="btn-grid"><span class="h"></span>${VARS.map((v) => `<span class="h hcol">${cap(v)}</span>`).join("")}${rows.map(([n, f]) => `<span class="h">${n}</span>${VARS.map((v) => `<div>${f(v)}</div>`).join("")}`).join("")}</div>`;
    const extra = `<div class="btn-extra">
      <div class="stack gap-3"><span class="g-cap">Sizes · 28 / 32 / 36</span>
        <div class="cluster gap-2">${["sm", "md", "lg"].map((s) => btn({ v: "primary", s, label: "Launch run" })).join("")}</div>
        <div class="cluster gap-2">${["sm", "md", "lg"].map((s) => btn({ v: "outline", s, label: "Cancel" })).join("")}</div></div>
      <div class="stack gap-3"><span class="g-cap">Icon only · tooltip names it</span>
        <div class="cluster gap-2">${["sm", "md", "lg"].map((s) => btn({ v: "ghost", s, iconOnly: true, icon: "more", label: "More actions", tip: "More actions" })).join("")}${btn({ v: "outline", iconOnly: true, icon: "plus", label: "Add task", tip: "Add task", tipKbd: "C" })}${btn({ v: "primary", iconOnly: true, icon: "play", label: "Launch run", tip: "Launch run" })}</div>
        <div class="cluster gap-2">${btn({ v: "secondary", iconOnly: true, icon: "link", label: "Copy link", tip: "Copy link", tipKbd: "⌘ L" })}${btn({ v: "destructive", iconOnly: true, icon: "trash", label: "Delete", tip: "Delete" })}${btn({ v: "outline", iconOnly: true, icon: "x", label: "Disabled", disabled: true, ariaDisabled: true })}</div></div>
      <div class="stack gap-3"><span class="g-cap">Try it · width holds while loading</span>
        <div class="cluster gap-2">${btn({ v: "primary", label: "Mark as done", icon: "ok", busyLabel: "Marking…", loads: true, kbd: ["⌘", "↵"] })}${btn({ v: "secondary", label: "Save changes", loads: true })}</div>
        <span class="t-meta t-muted num" data-width-readout>Width · measuring…</span></div>
    </div>`;
    return grid + extra;
  },
  init(p) {
    const btns = $$("[data-loads]", p).filter((b) => !b.matches("[aria-busy]") && b.closest(".btn-extra"));
    const out = $("[data-width-readout]", p);
    const read = () => { out.textContent = "Width · " + btns.map((b) => Math.round(b.getBoundingClientRect().width) + "px").join(" · "); };
    new ResizeObserver(read).observe(btns[0]); read();
    btns.forEach((b) => b.addEventListener("click", async () => { if (b.getAttribute("aria-busy") === "true") return; b.setAttribute("aria-busy", "true"); read(); await sleep(1600); b.removeAttribute("aria-busy"); read(); }));
  }
};

/* -- Dialog -- */
const frame = (inner, h) => `<div class="g-frame-backdrop frame"${h ? ` style="min-height:${h}px"` : ""}><div class="g-behind">${fakeRows()}</div><div class="g-scrim"></div>${inner}</div>`;
DUO.dialog = {
  cap: () => `${btn({ v: "secondary", s: "sm", label: "Hand over the keys…", attrs: 'data-open-dialog="confirm"' })}${btn({ v: "outline", s: "sm", label: "Delete run…", attrs: 'data-open-dialog="delete"' })}`,
  body: () => `<div class="stack gap-2"><span class="g-cap">Confirmation · last required task</span>${frame(`<div class="pw-dialog pw-dialog--static" role="group" aria-label="Hand over the keys, preview" inert>${dlgConfirmHTML("")}</div>`)}</div>
    <div class="stack gap-2" style="margin-top:var(--space-4)"><span class="g-cap">Destructive · alert dialog with type-to-confirm</span>${frame(`<div class="pw-dialog pw-dialog--static" role="group" aria-label="Delete run, preview" inert>${dlgDeleteHTML("")}</div>`)}</div>
    <span data-host></span>`,
  init(p) { initDialogs($("[data-host]", p), p); }
};

/* -- Popover & tooltip -- */
const TIP_BTNS = [["ok", "Mark as done", "⌘ ↵"], ["user-plus", "Assign", "A"], ["link", "Copy link", "⌘ L"], ["sidebar", "Toggle sidebar", "["], ["search", "Search", "⌘ K"]];
DUO.popover = {
  body: () => `<div class="stack gap-2"><span class="g-cap">Popover · glass, arrow, grows from its trigger</span>
      <div class="spec-pop"><span class="spec-trigger" aria-hidden="true">${btn({ v: "outline", label: "Apartment 12, move-in", icon: "runs", iconAfter: "chev-down", attrs: 'tabindex="-1"' })}</span>
      <div class="pw-float pw-popover pw-float--static" data-side="bottom" style="--ax:102px" role="group" aria-label="Run summary, preview" inert>${popoverHTML("", true)}</div></div></div>
    <div class="stack gap-3" style="margin-top:var(--space-6)"><span class="g-cap">Tooltip · text, or text with its shortcut</span>
      <div class="cluster gap-3" inert><span class="pw-tooltip pw-tooltip--static" style="--origin:bottom center">Mark as done ${kbds(["⌘", "↵"])}</span><span class="pw-tooltip pw-tooltip--static">Copy link</span><span class="pw-tooltip pw-tooltip--static">Search ${kbds(["⌘", "K"])}</span></div></div>
    <div class="try"><span class="try-l">Try it</span>
      <div class="cluster gap-2" data-pop-host>${btn({ v: "outline", label: "Apartment 12, move-in", icon: "runs", iconAfter: "chev-down", attrs: "data-pop-trigger" })}</div>
      <div class="cluster gap-1" data-tips>${TIP_BTNS.map(([i, l, k]) => btn({ v: "ghost", iconOnly: true, icon: i, label: l, tip: l, tipKbd: k })).join("")}</div>
      <span class="t-meta t-muted">Hover the first icon and wait; then sweep right — the rest appear at once.</span></div>`,
  init(p) {
    const trg = $("[data-pop-trigger]", p), el = document.createElement("div");
    el.className = "pw-float pw-popover"; el.id = nid("pop"); el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Run summary"); el.tabIndex = -1;
    if (hasPopover) el.setAttribute("popover", "manual"); else el.hidden = true;
    el.innerHTML = popoverHTML(el.id, true);
    $("[data-pop-host]", p).appendChild(el);
    bindPopover(el, trg, { arrow: true });
  }
};

/* -- Menu -- */
DUO.menu = {
  body() {
    const main = JSON.parse(JSON.stringify(TASK_MENU));
    main[0].items[3].expanded = true; main[0].items[3].hl = true;
    return `<div class="stack gap-2"><span class="g-cap">Menu with submenu · sections, shortcuts, checkable items, destructive</span>
      <div class="spec-menus" inert><div class="pw-float pw-menu pw-float--static" role="group" aria-label="Task menu, preview">${menuHTML(main, true)}</div>
        <div class="pw-float pw-menu pw-float--static spec-sub" role="group" aria-label="Status submenu, preview">${menuHTML(STATUS_MENU, true)}</div></div></div>
      <div class="try"><span class="try-l">Try it</span>
        <div class="split"><div class="cluster gap-2" data-menu-a>${btn({ v: "outline", label: "Task actions", icon: "bolt", iconAfter: "chev-down" })}</div>
        <div data-menu-b>${btn({ v: "ghost", iconOnly: true, icon: "more", label: "More actions", tip: "More actions" })}</div></div>
        <span class="t-meta t-muted">The right-hand trigger opens right-aligned; the menu grows from that corner. Try arrows, → on Status, typing “d”.</span></div>`;
  },
  init(p) {
    const onSelect = (id, it) => {
      const label = it.textContent.trim();
      if (id === "done") Toast.add({ tone: "success", title: "Task marked as done", desc: "Hand over the keys", action: { label: "Undo" }, progress: true });
      else if (id === "delete") Toast.add({ tone: "neutral", icon: "trash", title: "Task deleted", desc: "Hand over the keys", action: { label: "Undo" }, progress: true });
      else if (id === "copy") Toast.add({ tone: "info", title: "Link copied", desc: "alex@example.test can open it" });
      else if (/^s-/.test(id)) Toast.add({ tone: "info", title: "Status set to " + label });
      else if (!/^v-/.test(id)) Toast.add({ tone: "neutral", title: label });
    };
    [["a", "start"], ["b", "end"]].forEach(([k, align]) => {
      const host = $(`[data-menu-${k}]`, p), trg = $("button", host);
      const m = menuEl(TASK_MENU, "Task actions"), s = menuEl(STATUS_MENU, "Status");
      host.append(m, s);
      bindMenu(m, trg, { align, onSelect, subs: { status: s } });
    });
  }
};

/* -- Palette -- */
DUO.palette = {
  cap: () => `${btn({ v: "ghost", s: "sm", label: "No results", attrs: "data-pal-empty" })}${btn({ v: "ghost", s: "sm", label: "Loading", attrs: "data-pal-loading" })}${btn({ v: "ghost", s: "sm", label: "Reset", icon: "replay", attrs: "data-pal-reset" })}`,
  body: () => frame(`<div class="pw-palette pw-palette--static" role="group" aria-label="Command palette preview">${paletteHTML(nid("pal"))}</div>`, 490),
  init(p, theme) {
    const api = initPalette($(".pw-palette", p), { modal: false });
    $("[data-pal-empty]", p).addEventListener("click", () => api.setQuery("keyz"));
    $("[data-pal-loading]", p).addEventListener("click", () => api.simulateLoading(1800));
    $("[data-pal-reset]", p).addEventListener("click", () => api.reset());
    p._pal = api;
    api.setQuery(theme === "light" ? "move" : "");
  }
};

/* -- Toasts -- */
DUO.toast = {
  cap: () => `${btn({ v: "ghost", s: "sm", label: "Success", attrs: 'data-fire="success"' })}${btn({ v: "ghost", s: "sm", label: "Undo", attrs: 'data-fire="undo"' })}${btn({ v: "ghost", s: "sm", label: "Error", attrs: 'data-fire="error"' })}${btn({ v: "ghost", s: "sm", label: "Stack ×4", attrs: 'data-fire="stack"' })}`,
  body: () => `<span class="g-cap">Anatomy · success with undo countdown, info, error</span>
    <ol class="toast-spec" role="list" inert>
      ${toastStatic({ tone: "success", title: "Task marked as done", desc: "Hand over the keys", action: { label: "Undo" }, progress: 0.62 })}
      ${toastStatic({ tone: "info", title: "Link copied", desc: "alex@example.test can open it" })}
      ${toastStatic({ tone: "error", title: "Couldn’t save changes", desc: "Check your connection and try again.", action: { label: "Try again" } })}
    </ol>
    <div class="try"><span class="try-l">Try it — toasts appear bottom-right of the window</span>
      <div class="cluster gap-2">${btn({ v: "outline", s: "sm", label: "Success", icon: "ok", attrs: 'data-fire="success"' })}${btn({ v: "outline", s: "sm", label: "Info", icon: "info", attrs: 'data-fire="info"' })}${btn({ v: "outline", s: "sm", label: "Error", icon: "error", attrs: 'data-fire="error"' })}${btn({ v: "primary", s: "sm", label: "Mark as done", icon: "ok", attrs: 'data-fire="undo"' })}${btn({ v: "secondary", s: "sm", label: "Stack ×4", attrs: 'data-fire="stack"' })}</div></div>`,
  init(p) { $$("[data-fire]", p).forEach((b) => b.addEventListener("click", () => fire(b.dataset.fire))); }
};
function fire(k) {
  if (k === "success") Toast.add({ tone: "success", title: "Run launched", desc: "Apartment 12, move-in · 12 tasks" });
  else if (k === "info") Toast.add({ tone: "info", title: "Template updated", desc: "Runs already launched keep their own copy." });
  else if (k === "error") Toast.add({ tone: "error", title: "Couldn’t save changes", desc: "Check your connection and try again.", action: { label: "Try again" } });
  else if (k === "undo") Toast.add({ tone: "success", title: "Task marked as done", desc: "Hand over the keys", action: { label: "Undo" }, progress: true });
  else if (k === "stack") ["Inspect the apartment", "Read the meters", "Photograph the rooms", "Sign the handover form"].forEach((t, i) => setTimeout(() => Toast.add({ tone: "success", title: "Task marked as done", desc: t, duration: 9000 }), i * 220));
}

/* -- Alerts -- */
const alertHTML = (tone, title, desc, o = {}) => `<div class="pw-alert${o.compact ? " pw-alert--compact" : ""}" data-tone="${tone}" role="${tone === "error" ? "alert" : "status"}">
  <span class="pw-alert__icon">${ic({ info: "info", warning: "warn", error: "error", success: "ok" }[tone], "")}</span>
  <div class="pw-alert__title">${title}</div>${desc ? `<div class="pw-alert__desc">${desc}</div>` : ""}
  ${o.actions ? `<div class="pw-alert__actions">${o.actions}</div>` : ""}
  ${o.close ? `<span class="pw-alert__close">${iconBtn("x", "Dismiss", { attrs: "data-alert-close" })}</span>` : ""}</div>`;
DUO.alerts = {
  cap: () => btn({ v: "ghost", s: "sm", label: "Reset", icon: "replay", attrs: "data-alerts-reset" }),
  body: () => `<div class="stack gap-3" data-alert-list></div>
    <div class="stack gap-2" style="margin-top:var(--space-6)"><span class="g-cap">Banner · top of a page or panel</span>
      <div class="g-frame-backdrop" style="padding:0"><div class="pw-alert pw-banner" data-tone="warning" role="status"><span class="pw-alert__icon">${ic("warn", "")}</span><div class="pw-alert__title"><b>2 tasks have no assignee.</b> Assign them before this run can complete.</div><span>${btn({ v: "link", label: "Review tasks" })}</span></div><div class="g-fake-rows" aria-hidden="true">${[0, 1].map(() => "<div></div>").join("")}</div></div></div>
    <div class="stack gap-2" style="margin-top:var(--space-6)"><span class="g-cap">Form error · below the fields, above the button</span>
      <div class="live-body" style="margin:0"><form class="pw-miniform" novalidate data-signin>
        <div class="f"><label class="pw-label">Email</label><input class="pw-input" value="alex@example.test" autocomplete="off"></div>
        <div class="f"><label class="pw-label">Password</label><input class="pw-input" type="password" value="wrong-password" autocomplete="off"></div>
        <div data-signin-error aria-live="assertive"></div>
        ${btn({ v: "primary", s: "lg", block: true, label: "Sign in", busyLabel: "Signing in…", loads: true, attrs: 'type="submit"' }).replace('type="button"', "")}
      </form></div></div>
    <div class="stack gap-2" style="margin-top:var(--space-6)"><span class="g-cap">Page-level message · 404 for a run you can’t open</span>
      <div class="live-body" style="margin:0"><div class="pw-message"><span class="pw-message__mark">${ic("search", "")}</span><h3 class="t-heading">Run not found</h3><p>It may have been deleted, or you don’t have access.</p>${btn({ v: "outline", label: "Back to runs", icon: "arrow-right" })}</div></div></div>`,
  init(p) {
    const list = $("[data-alert-list]", p);
    const fill = () => {
      list.innerHTML = alertHTML("info", "Runs keep their own copy", "Editing a template never changes runs that were already launched.", { close: true })
        + alertHTML("warning", "2 tasks have no assignee", "Unassigned tasks won’t show up in anyone’s My tasks list.", { close: true, actions: btn({ v: "outline", s: "sm", label: "Assign tasks" }) + btn({ v: "ghost", s: "sm", label: "Not now" }) })
        + alertHTML("error", "Couldn’t save changes", "Check your connection and try again.", { close: true, actions: btn({ v: "outline", s: "sm", label: "Try again", icon: "replay" }) })
        + alertHTML("success", "Run launched", "Apartment 12, move-in is ready with 12 tasks.", { close: true, actions: btn({ v: "outline", s: "sm", label: "Open run", iconAfter: "arrow-right" }) });
      $$(".pw-alert", list).forEach((a, i) => { a.classList.add("enter"); a.style.animationDelay = i * tokenMs("stagger") + "ms"; });
    };
    fill();
    list.addEventListener("click", async (e) => {
      const c = e.target.closest("[data-alert-close]"); if (!c) return;
      const a = c.closest(".pw-alert"); a.classList.remove("enter"); a.style.animationDelay = ""; a.classList.add("exit");
      await animDone(a, 200);
      const h = a.offsetHeight; a.remove();
    });
    $("[data-alerts-reset]", p).addEventListener("click", fill);
    $("[data-signin-error]", p).innerHTML = alertHTML("error", "Invalid email or password.", "", { compact: true });
    const form = $("[data-signin]", p), err = $("[data-signin-error]", p), sb = $('button[type="submit"]', form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); if (sb.getAttribute("aria-busy") === "true") return;
      err.innerHTML = ""; sb.setAttribute("aria-busy", "true"); await sleep(1100); sb.removeAttribute("aria-busy");
      err.innerHTML = alertHTML("error", "Invalid email or password.", "", { compact: true }).replace('class="pw-alert', 'class="enter pw-alert');
    });
  }
};

/* -- Loading, progress, optimistic -- */
const skList = () => `<div class="sk-list" aria-busy="true"><span class="sr-only">Loading runs…</span>${[58, 44, 66, 38, 52].map((w) => `<div class="sk-row"><span class="skeleton dot"></span><span class="skeleton" style="width:${w}%"></span><span class="skeleton" style="width:44px;margin-left:auto"></span></div>`).join("")}</div>`;
const ctList = () => `<div class="sk-list sk-content">${FAKE_ROWS.slice(0, 5).map(([t, s, l, p], i) => `<div class="ld-row" style="--i:${i}">${ring(p, p === 1)}<span class="grow t-truncate">${t}</span>${badge(s, l)}</div>`).join("")}</div>`;
const skCards = () => [0, 1, 2].map(() => `<div class="sk-card" aria-busy="true"><span class="skeleton" style="width:62%"></span><span class="skeleton" style="width:92%"></span><span class="skeleton" style="width:44%"></span></div>`).join("");
const ctCards = () => [["Tenant move-in", "3 sections · 12 tasks", 0.8], ["Inspection", "4 sections · 14 tasks", 0.3], ["Apartment repair", "2 sections · 7 tasks", 1]].map(([t, m, p], i) => `<div class="ld-card" style="--i:${i}"><span class="t t-truncate">${t}</span><span class="t-meta t-muted">${m}</span><div class="pw-progress" data-size="thin"${p === 1 ? " data-done" : ""} style="--p:${p}"><i></i></div></div>`).join("");
const skRun = () => `<div class="sk-run" aria-busy="true"><span class="sr-only">Loading run…</span>
  <div>${[70, 55, 62, 48].map((w) => `<div class="cluster gap-2" style="flex-wrap:nowrap"><span class="skeleton" style="width:16px;height:16px;border-radius:50%;flex:none"></span><span class="skeleton" style="width:${w}%"></span></div>`).join("")}</div>
  <div><span class="skeleton" style="width:56%;height:14px"></span><span class="skeleton" style="width:90%"></span><span class="skeleton" style="width:78%"></span><span class="skeleton blk"></span></div>
  <div><span class="skeleton" style="width:44%"></span><span class="skeleton blk" style="height:28px"></span><span class="skeleton blk" style="height:28px"></span></div></div>`;
const ctRun = () => `<div class="sk-run sk-content">
  <div>${["Inspect the apartment", "Read the meters", "Photograph the rooms", "Sign the handover form"].map((t, i) => `<div class="cluster gap-2" style="flex-wrap:nowrap"><span class="pw-check" role="img" aria-label="${i < 2 ? "Done" : "To do"}" aria-checked="${i < 2}">${checkSvg}</span><span class="t-truncate t-label" style="${i < 2 ? "color:var(--muted-foreground)" : ""}">${t}</span></div>`).join("")}</div>
  <div class="stack gap-2"><span class="t-heading">Hand over the keys</span><span class="t-meta t-muted">Both key sets, plus the signed key receipt.</span><div>${btn({ v: "primary", s: "sm", label: "Mark as done", icon: "ok" })}</div></div>
  <div class="stack gap-2"><span class="t-meta t-muted">Variables</span><span class="pw-var">{{tenant_name}}</span><span class="pw-var">{{unit}}</span></div></div>`;
const OPT = [["Inspect the apartment", 1], ["Read the meters", 1], ["Photograph the rooms", 0], ["Sign the handover form", 0], ["Send the welcome email", 0]];
const optHTML = () => `<div data-opt>
  <div class="split" style="margin-bottom:var(--space-2)"><div class="cluster gap-2">${ring(0.4)}<span class="t-label"><span class="num" data-opt-count>2</span> of 5 done</span></div>
    <button class="pw-switch press" role="switch" aria-checked="false" type="button"><span class="pw-switch__track"></span><span>Next save fails</span></button></div>
  <div class="pw-progress" data-opt-bar role="progressbar" aria-label="Run progress" aria-valuemin="0" aria-valuemax="5" aria-valuenow="2" style="--p:.4;margin-bottom:var(--space-2)"><i></i></div>
  <div>${OPT.map(([n, d]) => { const id = nid("o"); return `<div class="opt-row"><button type="button" class="pw-check press" role="checkbox" aria-checked="${!!d}" aria-labelledby="${id}">${checkSvg}</button><span class="nm grow t-truncate" id="${id}">${n}</span><span class="meta"><span class="saving">${spinner()}Saving…</span></span></div>`; }).join("")}</div></div>`;
function initOpt(p) {
  const rows = $$(".opt-row", p), sw = $(".pw-switch", p), count = $("[data-opt-count]", p), bar = $("[data-opt-bar]", p), rg = $("[data-opt] .pw-ring", p);
  const update = () => {
    const n = rows.filter((r) => $(".pw-check", r).getAttribute("aria-checked") === "true").length;
    count.textContent = n; bar.style.setProperty("--p", n / 5); bar.setAttribute("aria-valuenow", n); rg.style.setProperty("--p", n / 5);
    n === 5 ? bar.setAttribute("data-done", "") : bar.removeAttribute("data-done"); n === 5 ? rg.setAttribute("data-done", "") : rg.removeAttribute("data-done");
  };
  sw.addEventListener("click", () => sw.setAttribute("aria-checked", String(sw.getAttribute("aria-checked") !== "true")));
  rows.forEach((r) => {
    const c = $(".pw-check", r), name = $(".nm", r).textContent;
    const toggle = async () => {
      if (r.getAttribute("aria-busy") === "true") return;
      const was = c.getAttribute("aria-checked") === "true";
      c.setAttribute("aria-checked", String(!was));
      if (!was) { c.setAttribute("data-pop", ""); setTimeout(() => c.removeAttribute("data-pop"), 420); }
      update(); r.setAttribute("aria-busy", "true");
      const fail = sw.getAttribute("aria-checked") === "true";
      await sleep(1000); r.removeAttribute("aria-busy");
      if (fail) {
        c.setAttribute("aria-checked", String(was)); update(); sw.setAttribute("aria-checked", "false");
        r.setAttribute("data-reverted", ""); setTimeout(() => r.removeAttribute("data-reverted"), 1600);
        Toast.add({ tone: "error", title: `Couldn’t update “${name}”`, desc: "Your change was reverted. Check your connection.", action: { label: "Try again", onClick: toggle } });
      }
    };
    c.addEventListener("click", toggle);
    $(".nm", r).addEventListener("click", toggle);
  });
}
DUO.loading = {
  cap: () => btn({ v: "ghost", s: "sm", label: "Reload", icon: "replay", attrs: "data-reload" }),
  body: () => `<div class="stack gap-6">
    <div class="stack gap-2"><span class="g-cap">List rows</span><div data-sk="list"></div></div>
    <div class="stack gap-2"><span class="g-cap">Cards</span><div class="g-grid g-cols-3" style="gap:var(--space-3)" data-sk="cards"></div></div>
    <div class="stack gap-2"><span class="g-cap">Run page · three zones</span><div data-sk="run"></div></div>
    <div class="stack gap-3"><span class="g-cap">Progress and spinners</span>
      <div class="split gap-3"><span class="t-meta t-muted" style="width:96px">Determinate</span><div class="pw-progress grow" role="progressbar" aria-label="Importing" aria-valuemin="0" aria-valuemax="100" aria-valuenow="40" data-det style="--p:.4"><i></i></div><span class="t-meta num" style="width:32px;text-align:right" data-det-n>40%</span></div>
      <div class="split gap-3"><span class="t-meta t-muted" style="width:96px">Indeterminate</span><div class="pw-progress grow" role="progressbar" aria-label="Loading" data-state="indeterminate"><i></i></div><span style="width:32px"></span></div>
      <div class="cluster gap-4"><span class="cluster gap-2 t-meta t-muted">${spinner()}14</span><span class="cluster gap-2 t-meta t-muted">${spinner(16)}16</span><span class="cluster gap-2 t-meta t-muted">${spinner(20)}20</span><span class="cluster gap-2 t-label" style="color:var(--muted-foreground)">${spinner()}Syncing changes…</span></div></div>
    <div class="stack gap-2"><span class="g-cap">Optimistic update · toggle a task, then turn on “Next save fails”</span>${optHTML()}</div></div>`,
  init(p) {
    const slots = { list: [$('[data-sk="list"]', p), skList, ctList], cards: [$('[data-sk="cards"]', p), skCards, ctCards], run: [$('[data-sk="run"]', p), skRun, ctRun] };
    let token = 0;
    const show = (k, kind) => { const [el, sk, ct] = slots[k]; el.innerHTML = kind === "sk" ? sk() : ct(); if (kind === "ct") el.classList.toggle("sk-content", k === "cards"); };
    const reload = async () => { const my = ++token; Object.keys(slots).forEach((k) => show(k, "sk")); await sleep(/[?&]hold/.test(location.search) ? 600000 : 1500); for (const k of Object.keys(slots)) { if (my !== token) return; show(k, "ct"); await sleep(220); } };
    $("[data-reload]", p).addEventListener("click", reload);
    Object.keys(slots).forEach((k) => show(k, "ct"));
    slots.cards[0].classList.add("sk-content");
    initOpt(p);
    const det = $("[data-det]", p), dn = $("[data-det-n]", p), seq = [0.15, 0.4, 0.72, 1, 0.55, 0.9];
    let si = 1;
    setInterval(() => { if (document.hidden) return; si = (si + 1) % seq.length; const v = seq[si]; det.style.setProperty("--p", v); det.setAttribute("aria-valuenow", Math.round(v * 100)); dn.textContent = Math.round(v * 100) + "%"; v === 1 ? det.setAttribute("data-done", "") : det.removeAttribute("data-done"); }, 2200);
  }
};

/* -- Empty states -- */
const ART = {
  runs: `<svg class="pw-empty__art" viewBox="0 0 96 72" aria-hidden="true"><rect class="sf2" x="26" y="12" width="56" height="46" rx="7" transform="rotate(5 54 35)"/><rect class="sf" x="14" y="8" width="58" height="48" rx="7"/><circle class="ac" cx="26" cy="21" r="3.75"/><path class="ac" d="M24.3 21l1.4 1.4 2.5-2.9"/><rect class="bar" x="34" y="19" width="28" height="4" rx="2"/><circle class="ln" cx="26" cy="33" r="3.75"/><rect class="bar" x="34" y="31" width="22" height="4" rx="2"/><circle class="ln" cx="26" cy="45" r="3.75"/><rect class="bar" x="34" y="43" width="25" height="4" rx="2"/><path class="ac" d="M70 64l11-11M74.5 53H81v6.5"/></svg>`,
  templates: `<svg class="pw-empty__art" viewBox="0 0 96 72" aria-hidden="true"><rect class="sf" x="24" y="6" width="46" height="58" rx="7"/><rect class="bar" x="31" y="15" width="20" height="4" rx="2"/><rect class="sf2" x="31" y="25" width="32" height="12" rx="3"/><rect class="sf2" x="31" y="41" width="32" height="12" rx="3"/><circle class="sf" cx="72" cy="56" r="10"/><path class="ac" d="M72 51.5v9M67.5 56h9"/></svg>`,
  search: `<svg class="pw-empty__art" viewBox="0 0 96 72" aria-hidden="true"><rect class="sf" x="14" y="10" width="54" height="46" rx="7"/><rect class="bar" x="22" y="19" width="26" height="4" rx="2"/><rect class="bar" x="22" y="29" width="34" height="4" rx="2"/><rect class="bar" x="22" y="39" width="20" height="4" rx="2"/><circle class="sf" cx="62" cy="38" r="14"/><path class="ac" d="M72.5 48.5L83 59"/><path class="ac" d="M56 38h12"/></svg>`,
  lock: `<svg class="pw-empty__art" viewBox="0 0 96 72" aria-hidden="true"><rect class="sf" x="20" y="8" width="56" height="48" rx="7"/><rect class="bar" x="28" y="17" width="24" height="4" rx="2"/><rect class="bar" x="28" y="27" width="40" height="4" rx="2"/><rect class="bar" x="28" y="37" width="30" height="4" rx="2"/><rect class="sf" x="52" y="36" width="28" height="24" rx="6"/><path class="ac" d="M59 36v-5a7 7 0 0114 0v5"/><circle class="acf" cx="66" cy="47" r="2.5"/><path class="ac" d="M66 49v4"/></svg>`
};
const EMPTY = [
  ["runs", "No runs yet", "Launch a run from a template to see it here.", "Launch a template", "play", "runs"],
  ["templates", "No templates yet", "Templates you create show up here, ready to launch.", "Create a template", "plus", "templates"],
  ["search", "No results for “keys”", "Check the spelling or try a different word.", "Clear search", "x", "search"],
  ["lock", "Only an administrator can change templates", "You can still launch runs from this template.", "Back to templates", "arrow-right", "permission"]
];
DUO.empty = {
  stack: true,
  body: () => `<div class="g-grid g-cols-4" style="gap:var(--space-3)">${EMPTY.map(([a, t, d, b, i, k]) => `<div class="pw-empty" data-kind="${k}">${ART[a]}<h3 class="pw-empty__title">${t}</h3><p class="pw-empty__desc">${d}</p>${btn({ v: k === "permission" ? "outline" : k === "search" ? "outline" : "primary", label: b, icon: i, attrs: `data-empty-action="${esc(b)}"` })}</div>`).join("")}</div>`,
  init(p) { $$("[data-empty-action]", p).forEach((b) => b.addEventListener("click", () => Toast.add({ tone: "neutral", title: b.dataset.emptyAction, desc: "Demo action — nothing changes here." }))); }
};

/* -- Sheet -- */
DUO.sheet = {
  cap: () => btn({ v: "secondary", s: "sm", label: "Task details", icon: "sidebar", attrs: "data-open-sheet" }),
  body: () => frame(`<aside class="pw-sheet pw-sheet--static" aria-label="Task details, preview" inert>${sheetHTML("")}</aside>`, 600) + `<span data-host></span>`,
  init(p) { initSheet($("[data-host]", p), p); }
};

/* ------------------------------ mount --------------------------------- */
function mountDuos() {
  $$("[data-duo]").forEach((host) => {
    const spec = DUO[host.dataset.duo];
    host.classList.add("duo"); if (spec.stack) host.classList.add("duo--stack");
    ["light", "dark"].forEach((theme) => {
      const p = document.createElement("div");
      p.className = "theme-panel"; p.dataset.theme = theme;
      p.innerHTML = `<div class="panel-cap"><span>${cap(theme)}</span><span class="cap-actions">${spec.cap ? spec.cap() : ""}</span></div><div class="stage">${spec.body(theme)}</div>`;
      host.appendChild(p);
      spec.init && spec.init(p, theme);
    });
  });
}

/* ------------------------ page palette (⌘K) ---------------------------- */
let palDlg, palApi;
function initGlobalPalette() {
  palDlg = document.createElement("dialog");
  palDlg.className = "pw-palette"; palDlg.setAttribute("aria-label", "Command palette");
  palDlg.innerHTML = paletteHTML(nid("gpal"));
  document.body.appendChild(palDlg);
  wireDialog(palDlg);
  palApi = initPalette(palDlg, { modal: true });
}
function openPalette(trg) {
  if (!palDlg || palDlg.open || document.querySelector("dialog[open]")) return;
  palApi.reset(); openDialog(palDlg, trg || document.activeElement); palApi.focus();
}
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
});
document.addEventListener("click", (e) => { const b = e.target.closest("[data-open-palette]"); if (b) openPalette(b); });

/* ---------------------------- init ------------------------------------- */
function renderPlayground() {
  const pg = $("[data-playground]");
  pg.innerHTML = btn({ v: "primary", label: "Command palette", icon: "search", kbd: ["⌘", "K"], attrs: "data-open-palette" })
    + btn({ v: "secondary", label: "Hand over the keys…", attrs: 'data-open-dialog="confirm"' })
    + btn({ v: "outline", label: "Delete run…", attrs: 'data-open-dialog="delete"' })
    + btn({ v: "outline", label: "Task details", icon: "sidebar", attrs: "data-open-sheet" })
    + btn({ v: "ghost", label: "Undo toast", icon: "undo", attrs: 'data-fire="undo"' })
    + btn({ v: "ghost", label: "Error toast", icon: "error", attrs: 'data-fire="error"' });
  initDialogs(document.body, pg); initSheet(document.body, pg);
  $$("[data-fire]", pg).forEach((b) => b.addEventListener("click", () => fire(b.dataset.fire)));
}
function renderLayers() {
  const L = [["Tooltip", "--z-tooltip", 100], ["Toast", "--z-toast", 90], ["Popover", "--z-popover", 80], ["Dialog · sheet · palette", "--z-dialog", 70], ["Overlay", "--z-overlay", 60], ["Dropdown", "--z-dropdown", 50], ["Sticky top bar", "--z-sticky", 10]];
  $("[data-layers]").innerHTML = `<div class="g-layers">${L.map(([n, t, z]) => `<div class="g-layer" style="--z:${z}"><span>${n}</span><i aria-hidden="true"></i><code>${t}</code><span class="num">${z}</span></div>`).join("")}</div>`;
}
function init() {
  setupSeg($('[data-seg="theme"]'), root.dataset.theme || "system", (v) => {
    const apply = () => { if (v === "system") delete root.dataset.theme; else root.dataset.theme = v; };
    store.set("pw-theme", v === "system" ? null : v);
    if (document.startViewTransition && motionOK()) document.startViewTransition(apply); else apply();
  });
  setupSeg($('[data-seg="motion"]'), root.dataset.motion || "system", (v) => {
    if (v === "system") delete root.dataset.motion; else root.dataset.motion = v;
    store.set("pw-motion", v === "system" ? null : v);
  });
  mountDuos(); renderPlayground(); renderLayers(); initGlobalPalette();
  const links = $$(".nav a[href^='#']");
  const spy = new IntersectionObserver((entries) => { for (const en of entries) if (en.isIntersecting) links.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + en.target.id))); }, { rootMargin: "-45% 0px -50% 0px" });
  $$(".sec").forEach((s) => spy.observe(s));
  const topbar = $("#topbar");
  addEventListener("scroll", () => topbar.classList.toggle("scrolled", scrollY > 4), { passive: true });
  document.fonts && document.fonts.ready.then(() => $$(".seg").forEach((s) => placeThumb(s, false)));
  addEventListener("resize", () => $$(".seg").forEach((s) => placeThumb(s, false)));
  window.__pw = { Toast, openPalette, openDialog, closeDialog };
}
init();
})();
