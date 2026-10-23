/* ==========================================================================
   Property Workflows — Form controls  ·  forms.js  (v0.1)
   Vanilla, no dependencies. Components are plain DOM + ARIA (WAI-ARIA APG).
   Structure: 1 utils · 2 popover manager · 3 data + markup helpers ·
   4 text/password/textarea · 5 select · 6 combobox + multi-select ·
   7 calendar + date / range / time · 8 number · 9 check/radio/switch/seg/slider ·
   10 file drop · 11 patterns (validation timing, launch form) · 12 gallery
   ========================================================================== */
(() => {
"use strict";

/* ============================ 1. utils ==================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
const motionOK = () => root.dataset.motion === "full" || (root.dataset.motion !== "reduce" && !reduceMQ.matches);
const tok = (n) => getComputedStyle(root).getPropertyValue(n).trim();
const tokMs = (n) => parseFloat(tok(n)) || 0;
const tokPx = (n) => parseFloat(tok(n)) || 0;
let _id = 0;
const uid = (p = "f") => `${p}${++_id}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (n, cls = "pw-icon", extra = "") => `<svg class="${cls}" aria-hidden="true" ${extra}><use href="#i-${n}"/></svg>`;
const emit = (el, name, detail) => el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };

/* WAAPI helper that reads easing / duration from tokens (so reduced motion collapses it) */
function animate(el, frames, { dur = "--spring-smooth-duration", ease = "--spring-smooth", delay = 0, fill = "both" } = {}) {
  if (!el.animate) return { finished: Promise.resolve(), cancel() {} };
  return el.animate(frames, { duration: tokMs(dur), easing: tok(ease) || "ease-out", delay, fill });
}

/* FLIP — record, mutate, play from the old position (no layout animation) */
function flip(container, mutate) {
  const kids = () => [...container.children].filter((e) => !e.hidden && !e.hasAttribute("data-leaving"));
  const first = new Map(kids().map((e) => [e, e.getBoundingClientRect()]));
  mutate();
  if (!motionOK()) return;
  kids().forEach((e) => {
    const f = first.get(e); if (!f) return;
    const l = e.getBoundingClientRect(), dx = f.left - l.left, dy = f.top - l.top;
    if (Math.abs(dx) > .5 || Math.abs(dy) > .5) animate(e, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { dur: "--spring-smooth-duration", ease: "--spring-smooth" });
  });
}

/* ======================== 2. popover manager ============================== */
const Pop = (() => {
  let cur = null;
  const timers = new WeakMap();
  const host = (trigger) => { const h = trigger.closest("[data-theme]"); return !h || h === root ? document.body : h; };
  function place(rec) {
    const { el, trigger, o } = rec;
    const r = (o.anchor || trigger).getBoundingClientRect();
    const gap = o.gap ?? 4, m = 8, vw = innerWidth, vh = innerHeight;
    el.style.minWidth = o.matchWidth ? `${r.width}px` : "";
    el.style.left = "0px"; el.style.top = "0px"; el.style.bottom = "auto";
    const pw = el.offsetWidth, ph = el.offsetHeight;
    let left = o.align === "end" ? r.right - pw : o.align === "center" ? r.left + (r.width - pw) / 2 : r.left;
    left = clamp(left, m, Math.max(m, vw - pw - m));
    if (!rec.dir) {
      const below = vh - r.bottom - gap - m, above = r.top - gap - m, need = Math.max(ph, o.estHeight || 0);
      rec.dir = need > below && above > below ? "up" : "down";
    }
    const up = rec.dir === "up";
    if (up) { el.style.top = "auto"; el.style.bottom = `${vh - r.top + gap}px`; } else { el.style.top = `${r.bottom + gap}px`; el.style.bottom = "auto"; }
    el.style.left = `${left}px`;
    const cx = clamp(r.left + r.width / 2 - left, 12, Math.max(12, pw - 12));
    el.style.setProperty("--origin", `${Math.round(o.originX ?? cx)}px ${up ? "100%" : "0"}`);
    el.style.setProperty("--pop-dir", up ? 1 : -1);
  }
  function open(el, trigger, o = {}) {
    if (cur && cur.el !== el) close(cur);
    clearTimeout(timers.get(el));
    const h = host(trigger);
    if (el.parentNode !== h) h.appendChild(el);
    const rec = { el, trigger, o, dir: null };
    cur = rec;
    if (!el.matches(":popover-open")) el.showPopover();
    el.removeAttribute("data-state"); void el.offsetWidth; el.dataset.state = "open";
    place(rec);
    o.onOpen && o.onOpen(rec);
    return rec;
  }
  function close(rec = cur, { focus = false } = {}) {
    if (!rec) return;
    const { el, trigger, o } = rec;
    if (cur === rec) cur = null;
    if (!el.matches(":popover-open") || el.dataset.state === "closing") return;
    el.dataset.state = "closing";
    timers.set(el, setTimeout(() => { if (el.dataset.state === "closing") { try { el.hidePopover(); } catch (e) {} el.removeAttribute("data-state"); } }, tokMs("--duration-base") * 0.7 + 30));
    o.onClose && o.onClose(rec);
    if (focus) (o.focusTarget || trigger).focus({ preventScroll: true });
  }
  const isOpen = (el) => !!cur && cur.el === el;
  document.addEventListener("pointerdown", (e) => {
    if (!cur) return;
    const { el, trigger, o } = cur, t = e.target;
    if (el.contains(t) || trigger.contains(t) || (o.owner && o.owner.contains(t))) return;
    close(cur);
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && cur && !e.defaultPrevented) { e.preventDefault(); close(cur, { focus: true }); }
  });
  const reflow = () => cur && place(cur);
  addEventListener("scroll", reflow, true);
  addEventListener("resize", reflow);
  return { open, close, isOpen, place, get current() { return cur; }, reposition: reflow };
})();
const makePop = (cls, attrs = "") => { const el = document.createElement("div"); el.className = `pw-pop ${cls}`; el.setAttribute("popover", "manual"); el.innerHTML = attrs; return el; };

/* ================== 3. data + shared markup helpers ======================= */
const USERS = [
  { id: "manager.a", email: "manager.a@example.test", role: "Manager", desc: "Property manager · 4 open tasks" },
  { id: "manager.b", email: "manager.b@example.test", role: "Manager", desc: "Property manager · 2 open tasks" },
  { id: "admin", email: "admin@example.test", role: "Admin", desc: "Workspace admin · 0 open tasks" },
  { id: "alex", email: "alex@example.test", role: "Manager", desc: "Property manager · 7 open tasks" },
  { id: "sam", email: "sam@example.test", role: "Manager", desc: "Property manager · 1 open task" },
];
const TAGS = ["Move-in", "Move-out", "Deposit", "Keys", "Inspection", "Cleaning", "Meters", "Lease", "Utilities", "Handover"].map((t) => ({ id: t.toLowerCase(), label: t }));
const UNITS = [
  { group: "Residential", items: [
    { id: "apartment", label: "Apartment", desc: "Single unit in a building" },
    { id: "house", label: "House", desc: "Detached, with a yard" },
    { id: "studio", label: "Studio", desc: "One room, open plan" } ] },
  { group: "Other", items: [
    { id: "commercial", label: "Commercial", desc: "Office or retail space" },
    { id: "parking", label: "Parking space", desc: "Coming soon", disabled: true } ] },
];
const STATUSES = [
  { id: "todo", label: "To do", dot: "todo" }, { id: "progress", label: "In progress", dot: "progress" },
  { id: "done", label: "Done", dot: "done" }, { id: "overdue", label: "Overdue", dot: "overdue" },
];
const initials = (email) => { const n = email.split("@")[0]; return (n.includes(".") ? n.split(".").map((p) => p[0]).join("") : n.slice(0, 2)).toUpperCase(); };
const avatar = (u, size) => `<span class="pw-avatar" ${size ? `data-size="${size}"` : ""} aria-hidden="true">${esc(initials(u.email))}</span>`;
const unassignedAvatar = (size) => `<span class="pw-avatar" data-kind="none" ${size ? `data-size="${size}"` : ""} aria-hidden="true">${icon("user")}</span>`;
const roleTag = (r) => `<span class="pw-tag" ${r === "Admin" ? 'data-tone="primary"' : ""}>${esc(r)}</span>`;
const mark = (text, q) => {
  if (!q) return esc(text);
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return esc(text);
  return `${esc(text.slice(0, i))}<mark class="pw-mark">${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
};
const tzName = (d) => {
  try { return new Intl.DateTimeFormat("en", { timeZone: "Europe/Kyiv", timeZoneName: "short" }).formatToParts(d || new Date()).find((p) => p.type === "timeZoneName").value; } catch (e) { return "GMT+3"; }
};
const tzTag = (d) => `<span class="pw-tz" title="Europe/Kyiv">${icon("clock")}<span>Kyiv time</span><span class="num">${tzName(d)}</span></span>`;

/* Field wrapper: label above · control · hint / error / note share one slot · counter */
function field({ id, kind, label, req, opt, hint, error, counter, tz, control, attrs = "", head = true, noteText = "", srLabel = "", after = "" }) {
  return `<div class="pw-field" data-pw="${kind}" ${hint ? "data-has-hint" : ""} ${error ? "data-invalid" : ""} ${attrs}>
  ${head ? `<div class="pw-field__head"><label class="pw-field__label" id="${id}-l" for="${id}">${esc(label)}${req ? '<span class="pw-req" aria-hidden="true">*</span>' : ""}</label>${opt ? '<span class="pw-field__opt">Optional</span>' : ""}${tz || ""}</div>` : (srLabel ? `<label class="sr-only" id="${id}-l" for="${id}">${esc(srLabel)}</label>` : "")}
  ${control}
  <div class="pw-field__foot"><div class="pw-field__msg">
    <p class="pw-hint" id="${id}-h">${hint ? esc(hint) : ""}</p>
    <p class="pw-error" id="${id}-e" aria-live="polite">${icon("alert")}<span class="pw-error__text">${error ? esc(error) : ""}</span></p>
    <p class="pw-note" id="${id}-n" aria-live="polite">${icon("info")}<span class="pw-note__text">${esc(noteText)}</span></p>
  </div>${counter ? `<span class="pw-counter num" aria-hidden="true">0/${counter}</span>` : ""}</div>${after}
</div>`;
}
const describedby = (id) => `aria-describedby="${id}-h ${id}-e ${id}-n"`;
const statusIcons = `<span class="pw-control__alert" aria-hidden="true">${icon("alert")}</span><span class="pw-control__ok" aria-hidden="true">${icon("check-circle")}</span><span class="pw-control__busy" aria-hidden="true"><svg class="pw-spinner" viewBox="0 0 16 16"><circle class="track" cx="8" cy="8" r="6" pathLength="1"/><circle class="arc" cx="8" cy="8" r="6" pathLength="1"/></svg></span>`;

/* Validation helpers */
function setInvalid(f, msg) {
  f.dataset.invalid = ""; delete f.dataset.valid;
  const t = $(".pw-error__text", f); if (t && msg) t.textContent = msg;
  $$("[data-pw-input]", f).forEach((e) => e.setAttribute("aria-invalid", "true"));
  const ctl = $(".pw-control, .pw-drop", f); ctl && ctl.removeAttribute("data-valid");
}
function clearInvalid(f) {
  if (!("invalid" in f.dataset)) return;
  delete f.dataset.invalid;
  $$("[data-pw-input]", f).forEach((e) => e.removeAttribute("aria-invalid"));
  const t = $(".pw-error__text", f);
  setTimeout(() => { if (t && !("invalid" in f.dataset)) t.textContent = ""; }, tokMs("--spring-smooth-duration") + 40);
}
function setNote(f, kind, msg) {
  if (kind) { f.dataset.note = kind; $(".pw-note__text", f).textContent = msg; const u = $(".pw-note use", f); if (u) u.setAttribute("href", kind === "ok" ? "#i-check-circle" : kind === "caps" ? "#i-caps" : "#i-info"); } else delete f.dataset.note;
}
const RULES = {
  required: (v, f) => (v.trim() ? "" : f.dataset.msg || "This field is required."),
  email: (v, f) => (!v.trim() ? f.dataset.msgRequired || "Enter an email address." : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : f.dataset.msg || "Enter a valid email, like name@example.test."),
  password: (v) => (!v ? "Enter a password." : v.length < 12 ? "Use at least 12 characters." : ""),
  caseName: (v) => (!v.trim() ? "Enter a case name." : v.length > 100 ? "Keep the case name under 100 characters." : ""),
  maxlen: (v, f) => (v.length > +f.dataset.max ? `Keep it under ${f.dataset.max} characters.` : ""),
};

const INIT = {};
function initAll(scope = document) {
  $$("[data-pw]", scope).forEach((el) => { if (el._pw) return; el._pw = true; const fn = INIT[el.dataset.pw]; if (fn) fn(el); });
}

/* ================ 4. text · password · textarea ============================ */
function textField(o) {
  const id = o.id || uid();
  const control = `<div class="pw-control" ${o.size ? `data-size="${o.size}"` : ""} ${o.demo ? `data-demo="${o.demo}"` : ""} ${o.value ? 'data-filled="true"' : ""} ${o.disabled ? "data-disabled" : ""}>
    ${o.lead ? `<span class="pw-control__lead">${icon(o.lead)}</span>` : ""}
    <input class="pw-control__input" data-pw-input id="${id}" type="${o.type || "text"}" value="${esc(o.value || "")}" placeholder="${esc(o.placeholder || "")}" ${o.disabled ? "disabled" : ""} ${o.readonly ? "readonly" : ""} ${o.error ? 'aria-invalid="true"' : ""} ${o.req ? 'aria-required="true"' : ""} ${describedby(id)} ${o.inputAttrs || ""}>
    ${statusIcons}
    ${o.clear ? `<button type="button" class="pw-iconbtn pw-clear" aria-label="Clear ${esc((o.label || "field").toLowerCase())}">${icon("x")}</button>` : ""}
    ${o.trail || ""}
  </div>`;
  return field({ id, kind: o.kind || "text", ...o, control });
}
function textareaField(o) {
  const id = o.id || uid();
  const control = `<div class="pw-control pw-textarea" ${o.demo ? `data-demo="${o.demo}"` : ""} ${o.disabled ? "data-disabled" : ""}>
    <div class="pw-textarea__grow" data-replicated="${esc(o.value || "")}"><textarea data-pw-input id="${id}" rows="1" placeholder="${esc(o.placeholder || "")}" ${o.disabled ? "disabled" : ""} ${o.error ? 'aria-invalid="true"' : ""} ${describedby(id)}>${esc(o.value || "")}</textarea></div>
  </div>`;
  return field({ id, kind: "text", ...o, control });
}
function passwordField(o) {
  const id = o.id || uid();
  const shown = o.revealed;
  const trail = `<span class="pw-capsdot" aria-hidden="true">${icon("caps")}</span><button type="button" class="pw-iconbtn pw-reveal" aria-label="Show password" aria-pressed="${!!shown}" ${o.disabled ? "disabled" : ""} ${o.revealDemo ? `data-demo="${o.revealDemo}"` : ""}>${icon("eye", "pw-icon", "data-off")}${icon("eye-off", "pw-icon", "data-on")}</button>`;
  return textField({ ...o, id, type: shown ? "text" : "password", kind: "password", trail, lead: "lock", inputAttrs: 'autocomplete="current-password" spellcheck="false"' });
}

INIT.text = (f) => {
  const ctl = $(".pw-control", f), input = $("[data-pw-input]", f);
  const clear = $(".pw-clear", f), counter = $(".pw-counter", f), grow = $(".pw-textarea__grow", f);
  const max = +f.dataset.max || 0, rule = f.dataset.validate;
  let blurred = false, phase = "idle";
  const setPhase = (p) => { if (p !== phase) { phase = p; emit(f, "pw:phase", { phase: p }); } };
  const sync = () => {
    ctl.dataset.filled = input.value ? "true" : "false";
    if (counter) { const n = input.value.length; counter.textContent = `${n}/${max}`; counter.dataset.state = n > max ? "over" : n >= max * 0.9 ? "near" : ""; }
    if (grow) grow.dataset.replicated = input.value;
  };
  const validate = () => {
    if (!rule) return true;
    const msg = RULES[rule](input.value, f);
    if (msg) { setInvalid(f, msg); delete f.dataset.valid; }
    else {
      clearInvalid(f);
      if ("showValid" in f.dataset && input.value) { f.dataset.valid = ""; setNote(f, "ok", f.dataset.okMsg || "Looks good."); }
      else { delete f.dataset.valid; if (f.dataset.note === "ok") setNote(f, null); }
    }
    return !msg;
  };
  f._validate = () => { blurred = true; return validate(); };
  f._reset = () => { input.value = ""; blurred = false; setPhase("idle"); clearInvalid(f); delete f.dataset.valid; if (f.dataset.note === "ok") setNote(f, null); sync(); };
  input.addEventListener("input", () => {
    sync();
    if (blurred || "invalid" in f.dataset) { validate(); setPhase("live"); }
    else if (f.dataset.note === "ok") setNote(f, null);
  });
  input.addEventListener("blur", () => {
    if (!blurred) { blurred = true; setPhase("blur"); }
    validate();
  });
  ctl.addEventListener("pointerdown", (e) => { if (e.target === ctl || e.target.closest(".pw-control__lead")) { e.preventDefault(); input.focus(); } });
  if (clear) {
    clear.addEventListener("click", () => { input.value = ""; sync(); input.focus(); input.dispatchEvent(new Event("input", { bubbles: true })); });
  }
  if (f.dataset.clearEsc !== undefined) input.addEventListener("keydown", (e) => { if (e.key === "Escape" && input.value) { e.preventDefault(); clear.click(); } });
  sync();
};
INIT.textarea = INIT.text;
INIT.password = (f) => {
  INIT.text(f);
  const input = $("[data-pw-input]", f), btn = $(".pw-reveal", f);
  btn.addEventListener("click", () => {
    const show = btn.getAttribute("aria-pressed") !== "true";
    const s = input.selectionStart, e = input.selectionEnd;
    input.type = show ? "text" : "password";
    btn.setAttribute("aria-pressed", String(show));
    input.focus(); try { input.setSelectionRange(s, e); } catch (err) {}
  });
  const caps = (e) => {
    if (!e.getModifierState) return;
    const on = e.getModifierState("CapsLock");
    if (on) setNote(f, "caps", "Caps Lock is on."); else if (f.dataset.note === "caps") setNote(f, null);
  };
  input.addEventListener("keydown", caps); input.addEventListener("keyup", caps);
  input.addEventListener("blur", () => { if (f.dataset.note === "caps" && !f.hasAttribute("data-keep-note")) setNote(f, null); });
};

/* =================== 5. shared listbox helpers + select ==================== */
function moveHl(hl, o, instant) {
  if (!o) { hl.removeAttribute("data-on"); return; }
  const cold = instant || !hl.hasAttribute("data-on");
  if (cold) hl.style.transition = "none";
  hl.style.height = `${o.offsetHeight}px`;
  hl.style.transform = `translateY(${o.offsetTop}px)`;
  if (cold) { void hl.offsetWidth; hl.style.transition = ""; }
  hl.setAttribute("data-on", "");
}
function revealOpt(wrap, o) {
  const t = o.offsetTop, b = t + o.offsetHeight, s = wrap.scrollTop, h = wrap.clientHeight;
  if (t < s) wrap.scrollTop = Math.max(0, t - 4); else if (b > s + h) wrap.scrollTop = b - h + 4;
}
const skeletonRows = (n = 3) => `<div class="pw-lb__loading" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<div><i class="sk-av skeleton"></i><span style="flex:1;display:grid;gap:6px"><i class="sk-ln skeleton" style="width:${70 - i * 12}%"></i><i class="sk-ln skeleton" style="width:${44 - i * 6}%"></i></span></div>`).join("")}</div>`;
const emptyBlock = (title, text, ic = "search") => `<div class="pw-lb__empty" data-enter>${icon(ic)}<b>${esc(title)}</b><span>${esc(text)}</span></div>`;
const kbdHints = (pairs) => `<div class="pw-lb__foot" aria-hidden="true">${pairs.map(([k, t]) => `<span style="display:inline-flex;align-items:center;gap:6px"><span class="pw-kbds">${k.map((x) => `<kbd>${x}</kbd>`).join("")}</span>${t}</span>`).join("")}</div>`;

function selectField(o) {
  const id = o.id || uid();
  const control = `<button type="button" class="pw-control pw-select" id="${id}" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-lb" aria-labelledby="${id}-l ${id}-v" data-pw-input data-focus-ring ${describedby(id)} ${o.disabled ? 'aria-disabled="true"' : ""} ${o.error ? 'aria-invalid="true"' : ""} ${o.demo ? `data-demo="${o.demo}"` : ""} ${o.size ? `data-size="${o.size}"` : ""}>
    <span class="pw-select__value" id="${id}-v"></span>${statusIcons}<span class="pw-control__chev">${icon("chev-down")}</span></button>`;
  return field({ id, kind: "select", ...o, control, attrs: `data-source="${o.source || "units"}" data-value="${o.value || ""}" data-placeholder="${esc(o.placeholder || "Select…")}" ${o.loading ? "data-loading" : ""} ${o.attrs || ""}` });
}
const SELECT_SRC = {
  units: UNITS,
  status: [{ items: STATUSES }],
};
INIT.select = (f) => {
  const btn = $(".pw-select", f), valEl = $(".pw-select__value", f);
  const groups = SELECT_SRC[f.dataset.source] || SELECT_SRC.units;
  const flat = groups.flatMap((g) => g.items);
  let value = f.dataset.value || "";
  const pop = makePop("pw-pop--lb");
  pop.innerHTML = `<div class="pw-lb"><span class="pw-lb__hl" aria-hidden="true"></span><div class="pw-lb__list" role="listbox" id="${btn.id}-lb" aria-labelledby="${btn.id}-l"></div><div class="pw-lb__aux"></div></div>`;
  const wrap = $(".pw-lb", pop), hl = $(".pw-lb__hl", pop), list = $(".pw-lb__list", pop), aux = $(".pw-lb__aux", pop);
  (btn.closest("[data-theme]") && btn.closest("[data-theme]") !== root ? btn.closest("[data-theme]") : document.body).appendChild(pop);
  let active = -1;
  const loading = () => "loading" in f.dataset;
  const label = (it) => `${it.dot ? `<span class="pw-dot" data-status="${it.dot}"></span>` : ""}${esc(it.label)}`;
  const showValue = () => {
    const it = flat.find((x) => x.id === value);
    if (it) { valEl.removeAttribute("data-placeholder"); valEl.innerHTML = label(it); }
    else { valEl.setAttribute("data-placeholder", ""); valEl.textContent = f.dataset.placeholder; }
  };
  let n = 0;
  const optHTML = (it) => {
    const i = n++;
    return `<div class="pw-opt" role="option" id="${btn.id}-o${i}" data-i="${i}" data-id="${it.id}" ${it.desc ? "data-rich" : ""} aria-selected="${it.id === value}" ${it.disabled ? 'aria-disabled="true"' : ""}>
      ${it.dot ? `<span class="pw-dot" data-status="${it.dot}"></span>` : ""}
      <span class="pw-opt__body"><span class="pw-opt__label">${esc(it.label)}</span>${it.desc ? `<span class="pw-opt__desc">${esc(it.desc)}</span>` : ""}</span>
      <span class="pw-opt__trail"><span class="pw-opt__check">${icon("check")}</span></span></div>`;
  };
  const render = () => {
    n = 0;
    if (loading()) { list.hidden = true; aux.innerHTML = skeletonRows(3); list.innerHTML = ""; btn.setAttribute("aria-busy", "true"); return; }
    btn.removeAttribute("aria-busy"); list.hidden = false; aux.innerHTML = "";
    list.innerHTML = groups.map((g, gi) => g.group
      ? `<div class="pw-group" role="group" aria-labelledby="${btn.id}-g${gi}"><div class="pw-group__label" id="${btn.id}-g${gi}">${esc(g.group)}</div>${g.items.map(optHTML).join("")}</div>`
      : g.items.map(optHTML).join("")).join("");
  };
  const opts = () => $$(".pw-opt", list);
  const setActive = (i, instant) => {
    const os = opts(); os.forEach((x) => x.removeAttribute("data-active"));
    const o = os[i];
    if (!o) { active = -1; btn.removeAttribute("aria-activedescendant"); moveHl(hl, null); return; }
    o.dataset.active = ""; active = i; btn.setAttribute("aria-activedescendant", o.id);
    revealOpt(wrap, o); moveHl(hl, o, instant);
  };
  const step = (from, dir) => { const os = opts(); for (let i = from + dir; i >= 0 && i < os.length; i += dir) if (!os[i].hasAttribute("aria-disabled")) return i; return from; };
  const firstEnabled = () => step(-1, 1), lastEnabled = () => step(opts().length, -1);
  const choose = (it, { close = true } = {}) => {
    if (!it || it.disabled) return;
    value = it.id; f.dataset.value = value; showValue();
    $$(".pw-opt", list).forEach((o) => o.setAttribute("aria-selected", String(o.dataset.id === value)));
    clearInvalid(f);
    emit(f, "pw:change", { value });
    if (close && Pop.isOpen(pop)) Pop.close(undefined, { focus: false });
  };
  const open = (idx) => {
    if (btn.getAttribute("aria-disabled") === "true") return;
    render();
    Pop.open(pop, btn, { matchWidth: true, owner: f, estHeight: 296, focusTarget: btn,
      onClose: () => { btn.setAttribute("aria-expanded", "false"); btn.removeAttribute("data-open"); btn.removeAttribute("aria-activedescendant"); } });
    btn.setAttribute("aria-expanded", "true"); btn.dataset.open = "true";
    if (!loading()) {
      const sel = opts().findIndex((o) => o.getAttribute("aria-selected") === "true");
      setActive(idx ?? (sel >= 0 ? sel : firstEnabled()), true);
    }
  };
  const close = (focus) => Pop.isOpen(pop) && Pop.close(undefined, { focus });
  let buf = "", bufT;
  const typeahead = (ch) => {
    clearTimeout(bufT); buf += ch.toLowerCase(); bufT = setTimeout(() => (buf = ""), 650);
    const os = opts(); if (!os.length) return -1;
    const start = Pop.isOpen(pop) ? active : os.findIndex((o) => o.getAttribute("aria-selected") === "true");
    const cyc = buf.length > 1 && [...buf].every((c) => c === buf[0]);
    const needle = cyc ? buf[0] : buf;
    for (let k = 1; k <= os.length; k++) {
      const i = (start + (cyc || buf.length === 1 ? k : k - 1) + os.length) % os.length, o = os[i];
      if (!o.hasAttribute("aria-disabled") && o.querySelector(".pw-opt__label").textContent.toLowerCase().startsWith(needle)) return i;
    }
    return -1;
  };
  btn.addEventListener("click", () => { if (btn.getAttribute("aria-disabled") === "true") return; Pop.isOpen(pop) ? close(false) : open(); });
  btn.addEventListener("keydown", (e) => {
    if (btn.getAttribute("aria-disabled") === "true") return;
    const isOpen = Pop.isOpen(pop);
    if (!isOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); open(e.key === "ArrowUp" ? undefined : undefined); if (e.key === "ArrowUp") setActive(lastEnabled()); return; }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        render(); const i = typeahead(e.key);
        if (i >= 0) { const o = opts()[i]; choose(flat.find((x) => x.id === o.dataset.id), { close: false }); }
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setActive(step(active, 1)); break;
      case "ArrowUp": e.preventDefault(); setActive(step(active, -1)); break;
      case "Home": e.preventDefault(); setActive(firstEnabled()); break;
      case "End": e.preventDefault(); setActive(lastEnabled()); break;
      case "PageDown": e.preventDefault(); setActive(Math.min(opts().length - 1, active + 5)); break;
      case "PageUp": e.preventDefault(); setActive(Math.max(0, active - 5)); break;
      case "Enter": case " ": { e.preventDefault(); const o = opts()[active]; if (o) { choose(flat.find((x) => x.id === o.dataset.id)); } break; }
      case "Tab": { const o = opts()[active]; if (o) choose(flat.find((x) => x.id === o.dataset.id), { close: false }); close(false); break; }
      case "Escape": e.preventDefault(); close(true); break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { const i = typeahead(e.key); if (i >= 0) setActive(i); }
    }
  });
  pop.addEventListener("pointerdown", (e) => e.preventDefault());
  pop.addEventListener("pointermove", (e) => { const o = e.target.closest(".pw-opt"); if (o && !o.hasAttribute("aria-disabled") && +o.dataset.i !== active) setActive(+o.dataset.i); });
  pop.addEventListener("click", (e) => { const o = e.target.closest(".pw-opt"); if (o && !o.hasAttribute("aria-disabled")) choose(flat.find((x) => x.id === o.dataset.id)); btn.focus(); });
  f._set = (v) => { value = v; f.dataset.value = v; showValue(); };
  f._open = open; f._pop = pop;
  showValue();
};

/* ===================== 6. combobox · assignee picker · multi-select ======== */
const NONE = { id: "", label: "Unassigned", none: true };
const COMBO_SRC = {
  users: { items: [NONE, ...USERS.map((u) => ({ ...u, label: u.email }))], placeholder: "Unassigned", empty: ["No matches", "Try a different name or email."], hints: [[["↑", "↓"], "to move"], [["↵"], "to assign"]] },
  tags: { items: TAGS, placeholder: "Add a tag", empty: ["No tags match", "Check the spelling or clear the search."], hints: [[["↑", "↓"], "to move"], [["↵"], "to toggle"], [["⌫"], "to remove"]] },
  watchers: { items: USERS.map((u) => ({ ...u, label: u.email })), placeholder: "Add a watcher", empty: ["No matches", "Try a different name or email."], hints: [[["↑", "↓"], "to move"], [["↵"], "to toggle"]] },
};
function comboField(o) {
  const id = o.id || uid();
  const multi = !!o.multi;
  const control = `<div class="pw-control ${multi ? "pw-multi" : "pw-combo"}" ${o.compact ? "data-compact" : ""} ${o.size ? `data-size="${o.size}"` : ""} ${o.demo ? `data-demo="${o.demo}"` : ""} ${o.disabled ? "data-disabled" : ""}>
    ${multi ? "" : '<span class="pw-combo__lead"></span>'}
    <input class="pw-control__input" data-pw-input id="${id}" type="text" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-lb" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(o.placeholder || "")}" ${o.disabled ? "disabled" : ""} ${o.error ? 'aria-invalid="true"' : ""} ${describedby(id)}>
    ${statusIcons}<span class="pw-control__chev">${icon("chev-down")}</span>
  </div>`;
  const attrs = `data-source="${o.source}" data-value="${(o.value || "").toString()}" ${multi ? "data-multi" : ""} ${o.async ? "data-async" : ""} ${o.loading ? "data-loading" : ""} ${o.unassigned === false ? "" : "data-unassigned"}`;
  return field({ id, kind: "combo", ...o, control, attrs: `${attrs} ${o.attrs || ""}`, head: o.head !== false, srLabel: o.srLabel });
}
const userOption = (it, { q = "", selected = false, multi = false, i = 0, id = "", active = false } = {}) => {
  const lead = it.none ? unassignedAvatar("lg") : avatar(it, "lg");
  return `<div class="pw-opt" role="option" id="${id}" data-i="${i}" data-id="${it.id}" data-rich ${active ? "data-active" : ""} aria-selected="${selected}">
    ${multi ? `<span class="pw-opt__box" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2.5 6.25l2.25 2.25L9.5 3.5" pathLength="1"/></svg></span>` : ""}${lead}
    <span class="pw-opt__body"><span class="pw-opt__label">${mark(it.label, q)}</span><span class="pw-opt__desc">${it.none ? "No one is responsible yet" : mark(it.desc, q)}</span></span>
    <span class="pw-opt__trail">${it.role ? roleTag(it.role) : ""}${multi ? "" : `<span class="pw-opt__check">${icon("check")}</span>`}</span></div>`;
};
const tagOption = (it, { q = "", selected = false, i = 0, id = "", active = false } = {}) =>
  `<div class="pw-opt" role="option" id="${id}" data-i="${i}" data-id="${it.id}" ${active ? "data-active" : ""} aria-selected="${selected}">
    <span class="pw-opt__box" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2.5 6.25l2.25 2.25L9.5 3.5" pathLength="1"/></svg></span>
    <span class="pw-opt__body"><span class="pw-opt__label">${mark(it.label, q)}</span></span></div>`;

INIT.combo = (f) => {
  const src = COMBO_SRC[f.dataset.source], multi = "multi" in f.dataset, isUsers = f.dataset.source !== "tags";
  const items = f.dataset.unassigned === undefined || multi ? src.items.filter((x) => !x.none) : src.items;
  const ctl = $(".pw-control", f), input = $("input[data-pw-input]", f), lead = $(".pw-combo__lead", f), chev = $(".pw-control__chev", f);
  const compact = ctl.hasAttribute("data-compact");
  const pop = makePop("pw-pop--lb");
  pop.innerHTML = `<div class="pw-lb"><span class="pw-lb__hl" aria-hidden="true"></span><div class="pw-lb__list" role="listbox" id="${input.id}-lb" aria-label="${esc($(".pw-field__label, .sr-only", f)?.textContent || "Options")}" ${multi ? 'aria-multiselectable="true"' : ""}></div><div class="pw-lb__aux"></div></div>${kbdHints(src.hints)}`;
  const wrap = $(".pw-lb", pop), hl = $(".pw-lb__hl", pop), list = $(".pw-lb__list", pop), aux = $(".pw-lb__aux", pop);
  const live = document.createElement("div"); live.className = "sr-only"; live.setAttribute("aria-live", "polite"); f.appendChild(live);
  (ctl.closest("[data-theme]") && ctl.closest("[data-theme]") !== root ? ctl.closest("[data-theme]") : document.body).appendChild(pop);

  let sel = multi ? (f.dataset.value ? f.dataset.value.split(",").filter(Boolean) : []) : (f.dataset.value ?? "");
  let query = "", typing = false, matches = [], active = -1, busy = false, busyT;
  const byId = (id) => items.find((x) => x.id === id);
  const isSel = (id) => (multi ? sel.includes(id) : sel === id);
  const isLoading = () => busy || "loading" in f.dataset;

  /* ---- selection display ---- */
  const chipHTML = (it) => `<span class="pw-chip" data-id="${it.id}" ${isUsers ? 'data-tone="avatar"' : ""}>${isUsers ? avatar(it) : ""}<span class="pw-chip__label">${esc(isUsers ? it.email.split("@")[0] : it.label)}</span><button type="button" class="pw-chip__x" tabindex="-1" aria-label="Remove ${esc(it.label)}">${icon("x")}</button></span>`;
  const showSingle = () => {
    const it = byId(sel);
    input.value = it && !it.none ? it.label : "";
    input.placeholder = it && it.none ? "Unassigned" : src.placeholder;
    lead.innerHTML = it && !it.none ? avatar(it) : "";
    ctl.dataset.filled = it && !it.none ? "true" : "false";
  };
  const layoutChips = () => {
    if (!multi) return;
    $$(".pw-chip--more", ctl).forEach((m) => m.remove());
    const chips = $$(".pw-chip", ctl);
    chips.forEach((c) => (c.hidden = false));
    input.placeholder = chips.length ? "" : src.placeholder;
    if (!compact || chips.length < 2) return;
    const cs = getComputedStyle(ctl), pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const gap = parseFloat(cs.columnGap) || 4;
    const avail = ctl.clientWidth - pad - chev.offsetWidth - 40 - gap * 2;
    const moreW = 36;
    const w = chips.map((c) => c.offsetWidth + gap);
    let k = chips.length, total = w.reduce((a, b) => a + b, 0);
    if (total > avail) { k = 0; let sum = 0; while (k < chips.length && sum + w[k] + moreW <= avail) { sum += w[k]; k++; } k = Math.max(1, k); }
    if (k < chips.length) {
      const hidden = chips.slice(k);
      hidden.forEach((c) => (c.hidden = true));
      const names = hidden.map((c) => c.querySelector(".pw-chip__label").textContent);
      const more = document.createElement("button");
      more.type = "button"; more.className = "pw-chip pw-chip--more"; more.tabIndex = -1;
      more.setAttribute("aria-label", `${hidden.length} more selected: ${names.join(", ")}. Open list`);
      more.textContent = `+${hidden.length}`;
      chips[k - 1].after(more);
    }
  };
  const renderChips = (newId) => {
    $$(".pw-chip", ctl).forEach((c) => c.remove());
    sel.forEach((id) => { const it = byId(id); if (!it) return; input.insertAdjacentHTML("beforebegin", chipHTML(it)); if (id === newId) input.previousElementSibling.setAttribute("data-new", ""); });
    ctl.dataset.filled = sel.length ? "true" : "false";
    layoutChips();
  };

  /* ---- list ---- */
  const optHTML = (it, i) => {
    const o = { q: query.trim(), selected: isSel(it.id), i, id: `${input.id}-o${i}`, multi };
    return isUsers ? userOption(it, o) : tagOption(it, o);
  };
  const filter = () => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => (it.none ? !q : !q || it.label.toLowerCase().includes(q) || (it.desc || "").toLowerCase().includes(q)));
  };
  const opts = () => $$(".pw-opt", list);
  const setActive = (i, instant) => {
    const os = opts(); os.forEach((x) => x.removeAttribute("data-active"));
    const o = os[i];
    if (!o) { active = -1; input.removeAttribute("aria-activedescendant"); moveHl(hl, null); return; }
    o.dataset.active = ""; active = i; input.setAttribute("aria-activedescendant", o.id);
    revealOpt(wrap, o); moveHl(hl, o, instant);
  };
  const render = (keepActive) => {
    if (isLoading()) {
      list.hidden = true; list.innerHTML = ""; aux.innerHTML = skeletonRows(3); matches = []; active = -1; moveHl(hl, null);
      input.setAttribute("aria-busy", "true"); live.textContent = "Searching…"; Pop.reposition(); return;
    }
    input.removeAttribute("aria-busy");
    matches = filter();
    if (!matches.length) {
      list.hidden = true; list.innerHTML = ""; aux.innerHTML = emptyBlock(src.empty[0], src.empty[1]); moveHl(hl, null); active = -1;
      input.removeAttribute("aria-activedescendant"); live.textContent = "No matches"; Pop.reposition(); return;
    }
    aux.innerHTML = ""; list.hidden = false;
    list.innerHTML = matches.map(optHTML).join("");
    live.textContent = `${matches.length} result${matches.length === 1 ? "" : "s"}`;
    const selIdx = matches.findIndex((m) => isSel(m.id));
    const keep = keepActive && active >= 0 ? Math.min(active, matches.length - 1) : -1;
    Pop.reposition();
    setActive(keep >= 0 ? keep : query.trim() ? 0 : multi ? 0 : selIdx >= 0 ? selIdx : 0, true);
  };
  const isOpen = () => Pop.isOpen(pop);
  const openList = () => {
    if (input.disabled) return;
    if (!isOpen()) {
      Pop.open(pop, ctl, { matchWidth: true, anchor: ctl, align: ctl.offsetWidth < 260 ? "end" : "start", owner: f, estHeight: 330, focusTarget: input,
        onClose: () => { input.setAttribute("aria-expanded", "false"); ctl.removeAttribute("data-open"); input.removeAttribute("aria-activedescendant"); } });
      input.setAttribute("aria-expanded", "true"); ctl.dataset.open = "true";
    }
    render();
  };
  const closeList = () => { if (isOpen()) Pop.close(undefined, { focus: false }); };
  const resetText = () => { query = ""; typing = false; if (multi) input.value = ""; else showSingle(); };

  const commit = (it) => {
    if (!it) return;
    if (multi) {
      const had = isSel(it.id);
      if (had) { removeChip(it.id, false); } else { sel = [...sel, it.id]; flipChips(() => renderChips(it.id)); }
      query = ""; input.value = ""; typing = false;
      render(true); announce(`${it.label} ${had ? "removed" : "selected"}`);
    } else {
      sel = it.id; f.dataset.value = sel; resetText(); closeList();
    }
    clearInvalid(f);
    emit(f, "pw:change", { value: sel });
  };
  const announce = (t) => { live.textContent = t; };
  const flipChips = (mutate) => flip(ctl, mutate);
  const removeChip = (id, focus = true) => {
    const chip = $(`.pw-chip[data-id="${id}"]`, ctl);
    sel = sel.filter((x) => x !== id);
    const doIt = () => { chip && chip.remove(); layoutChips(); ctl.dataset.filled = sel.length ? "true" : "false"; };
    if (chip && motionOK()) { chip.setAttribute("data-leaving", ""); setTimeout(() => flipChips(doIt), tokMs("--duration-base") * 0.7 - 10); } else doIt();
    if (focus) input.focus();
    announce(`${(byId(id) || {}).label || "Item"} removed`);
    if (isOpen()) render(true);
    emit(f, "pw:change", { value: sel });
  };

  /* ---- events ---- */
  ctl.addEventListener("pointerdown", (e) => {
    if (input.disabled) return;
    if (e.target.closest(".pw-chip__x")) return;
    if (e.target !== input) e.preventDefault();
    if (e.target.closest(".pw-chip--more")) { input.focus(); openList(); return; }
    input.focus();
    if (isOpen()) { if (e.target !== input) closeList(); } else openList();
  });
  ctl.addEventListener("click", (e) => { const x = e.target.closest(".pw-chip__x"); if (x) { e.preventDefault(); removeChip(x.closest(".pw-chip").dataset.id); } });
  input.addEventListener("input", () => {
    typing = true; query = input.value;
    ctl.dataset.filled = (multi ? sel.length || query : query) ? "true" : "false";
    if (!isOpen()) openList();
    if ("async" in f.dataset) {
      busy = true; render(); clearTimeout(busyT);
      busyT = setTimeout(() => { busy = false; if (isOpen()) render(); }, 520);
    } else render();
  });
  input.addEventListener("keydown", (e) => {
    if (input.disabled) return;
    const open = isOpen(), os = opts();
    const move = (to) => { if (os.length) setActive(to); };
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); if (!open) { openList(); if (e.altKey) break; } else move(Math.min(os.length - 1, active + 1)); break;
      case "ArrowUp": e.preventDefault(); if (!open) { openList(); } else move(Math.max(0, active - 1)); break;
      case "Home": if (open && !query && os.length) { e.preventDefault(); move(0); } break;
      case "End": if (open && !query && os.length) { e.preventDefault(); move(os.length - 1); } break;
      case "PageDown": if (open) { e.preventDefault(); move(Math.min(os.length - 1, active + 5)); } break;
      case "PageUp": if (open) { e.preventDefault(); move(Math.max(0, active - 5)); } break;
      case "Enter": if (open && os[active]) { e.preventDefault(); commit(byId(os[active].dataset.id)); } break;
      case "Escape":
        if (open) { e.preventDefault(); closeList(); if (typing) resetText(); }
        else if (typing || (!multi && sel)) { e.preventDefault(); if (typing) resetText(); else { sel = ""; f.dataset.value = ""; showSingle(); emit(f, "pw:change", { value: sel }); } }
        break;
      case "Backspace": if (multi && !input.value && sel.length) { e.preventDefault(); removeChip(sel[sel.length - 1]); } break;
      case "Tab": closeList(); break;
    }
  });
  input.addEventListener("blur", () => { setTimeout(() => { if (!f.contains(document.activeElement) && !pop.contains(document.activeElement)) { closeList(); resetText(); if (f.dataset.validate === "required") { if (!(multi ? sel.length : sel)) setInvalid(f, f.dataset.msg || "Choose an option."); } } }, 0); });
  pop.addEventListener("pointerdown", (e) => e.preventDefault());
  pop.addEventListener("pointermove", (e) => { const o = e.target.closest(".pw-opt"); if (o && +o.dataset.i !== active) setActive(+o.dataset.i); });
  pop.addEventListener("click", (e) => { const o = e.target.closest(".pw-opt"); if (o) { commit(byId(o.dataset.id)); input.focus(); } });
  if (multi && compact && "ResizeObserver" in window) new ResizeObserver(() => { if (!isOpen()) layoutChips(); }).observe(ctl);
  if (document.fonts) document.fonts.ready.then(() => multi && layoutChips());
  f._set = (v) => { sel = multi ? v : v; if (multi) renderChips(); else { f.dataset.value = v; showSingle(); } };
  f._pop = pop;
  f._open = openList;
  multi ? renderChips() : showSingle();
};

/* ================ 7. calendar (ARIA grid) · date · range · time ============ */
/* "Today" is fixed so the gallery is deterministic: Friday 23 Oct 2026 (Kyiv). */
const TODAY = new Date(2026, 9, 23);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const addMonthsKeep = (d, n) => { const t = new Date(d.getFullYear(), d.getMonth() + n, 1); const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), last)); };
const sameDay = (a, b) => !!a && !!b && a.getTime() === b.getTime();
const dkey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromKey = (k) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
const F_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const F_SHORT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const F_LONG = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const F_MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const fmtDate = (d) => F_DATE.format(d);
function parseDate(s) {
  s = (s || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;
  if (s === "today") return TODAY;
  if (s === "tomorrow") return addDays(TODAY, 1);
  if (s === "next week") return addDays(TODAY, 7);
  let m, d, mo, y;
  if ((m = /^(\d{1,2})[ ./-]+([a-z]{3,9})\.?(?:[ ./,-]+(\d{4}))?$/.exec(s))) { d = +m[1]; mo = MONTHS.indexOf(m[2].slice(0, 3)); y = m[3] ? +m[3] : TODAY.getFullYear(); }
  else if ((m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s))) { d = +m[1]; mo = +m[2] - 1; y = +m[3]; }
  else if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) { y = +m[1]; mo = +m[2] - 1; d = +m[3]; }
  else return undefined;
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return undefined;
  const r = new Date(y, mo, d);
  return r.getMonth() === mo && r.getDate() === d ? r : undefined;
}

function Calendar(host, opts) {
  const o = { mode: "single", months: 1, min: null, max: null, value: null, start: null, end: null, onSelect() {}, ...opts };
  const uidc = uid("cal");
  let view = startOfMonth(o.value || o.start || TODAY);
  let focusDate = o.value || o.start || (sameMonth(TODAY, view) ? TODAY : view);
  let picking = false, hover = null, pane = null;
  function sameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }
  host.classList.add("pw-cal");
  host.innerHTML = `<button type="button" class="pw-iconbtn pw-cal__nav" data-dir="prev" aria-label="Previous month">${icon("chev-left")}</button>
    <button type="button" class="pw-iconbtn pw-cal__nav" data-dir="next" aria-label="Next month">${icon("chev")}</button>
    <div class="pw-cal__viewport"></div><div class="pw-cal__live" aria-live="polite"></div>`;
  const viewport = $(".pw-cal__viewport", host), live = $(".pw-cal__live", host);
  const disabled = (d) => (o.min && d < o.min) || (o.max && d > o.max);
  const monthsShown = () => Array.from({ length: o.months }, (_, i) => addMonths(view, i));
  const inView = (d) => monthsShown().some((m) => sameMonth(m, d));

  function rangeInfo(d) {
    if (o.mode !== "range" || !o.start) return null;
    const e = o.end || (picking && hover ? hover : null);
    let a = o.start, b = e;
    if (b && b < a) [a, b] = [b, a];
    if (sameDay(d, a)) return { r: "start", single: !b || sameDay(a, b) };
    if (b && sameDay(d, b)) return { r: "end" };
    if (b && d > a && d < b) return { r: o.end ? "mid" : "preview" };
    return null;
  }
  function cellAttrs(d, m, col) {
    const outside = !sameMonth(d, m), dis = disabled(d);
    let sel = o.mode === "single" ? sameDay(d, o.value) : sameDay(d, o.start) || sameDay(d, o.end);
    const ri = rangeInfo(d);
    const rovers = sameDay(d, focusDate) && !outside;
    return `role="gridcell" class="pw-day" tabindex="${rovers ? 0 : -1}" data-date="${dkey(d)}" data-col="${col}" aria-label="${F_LONG.format(d)}${sameDay(d, TODAY) ? ", today" : ""}" aria-selected="${sel}" ${dis ? 'aria-disabled="true"' : ""} ${outside ? "data-outside" : ""} ${sameDay(d, TODAY) ? 'data-today aria-current="date"' : ""} ${ri ? `data-range="${ri.r}"` : ""} ${ri && ri.single ? "data-range-end data-range-start" : ""} ${picking && hover && sameDay(d, hover) ? "data-hover" : ""}`;
  }
  function monthHTML(m, i) {
    const first = new Date(m.getFullYear(), m.getMonth(), 1), off = (first.getDay() + 6) % 7, start = addDays(first, -off);
    const tid = `${uidc}-t${i}`;
    const dows = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((n) => `<div role="columnheader" class="pw-cal__dow" aria-label="${n}">${n.slice(0, 2)}</div>`).join("");
    let rows = "";
    for (let r = 0; r < 6; r++) {
      let cells = "";
      for (let c = 0; c < 7; c++) { const d = addDays(start, r * 7 + c); cells += `<div ${cellAttrs(d, m, c)}><span class="pw-day__n">${d.getDate()}</span></div>`; }
      rows += `<div role="row" class="pw-cal__row">${cells}</div>`;
    }
    return `<div class="pw-cal__month"><h3 class="pw-cal__title" id="${tid}">${F_MONTH.format(m)}</h3><div role="grid" aria-labelledby="${tid}"><div role="row" class="pw-cal__row">${dows}</div>${rows}</div></div>`;
  }
  function build() { const el = document.createElement("div"); el.className = "pw-cal__pane"; el.innerHTML = monthsShown().map(monthHTML).join(""); return el; }
  function render(dir = 0) {
    const next = build(), old = pane;
    if (dir && old && motionOK()) {
      old.setAttribute("data-leaving", ""); viewport.appendChild(next);
      const dist = tokPx("--distance-slide");
      const out = animate(old, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${-dir * dist}px)` }], { dur: "--duration-base", ease: "--ease-exit" });
      const rm = () => old.remove(); out.finished ? out.finished.then(rm, rm) : rm();
      animate(next, [{ opacity: 0, transform: `translateX(${dir * dist}px)` }, { opacity: 1, transform: "none" }]);
    } else { viewport.replaceChildren(next); }
    pane = next;
    const lab = monthsShown().map((m) => F_MONTH.format(m)).join(" – ");
    live.textContent = lab;
  }
  function refresh() {
    $$(".pw-day", pane).forEach((cell) => {
      const d = fromKey(cell.dataset.date), m = addMonths(view, +(cell.closest(".pw-cal__month") === pane.children[1] ? 1 : 0));
      const sel = o.mode === "single" ? sameDay(d, o.value) : sameDay(d, o.start) || sameDay(d, o.end);
      cell.setAttribute("aria-selected", String(sel));
      const ri = rangeInfo(d);
      ri ? cell.setAttribute("data-range", ri.r) : cell.removeAttribute("data-range");
      ri && ri.single ? (cell.setAttribute("data-range-end", ""), cell.setAttribute("data-range-start", "")) : (cell.removeAttribute("data-range-end"), cell.removeAttribute("data-range-start"));
      picking && hover && sameDay(d, hover) ? cell.setAttribute("data-hover", "") : cell.removeAttribute("data-hover");
    });
  }
  function cellFor(d) { return $(`.pw-day[data-date="${dkey(d)}"]:not([data-outside])`, pane) || $(`.pw-day[data-date="${dkey(d)}"]`, pane); }
  function setRover(d) {
    $$('.pw-day[tabindex="0"]', pane).forEach((c) => (c.tabIndex = -1));
    const c = cellFor(d); if (c) c.tabIndex = 0; return c;
  }
  function showMonthOf(d, focus) {
    if (inView(d)) return false;
    const dir = d < view ? -1 : 1;
    view = d < view ? startOfMonth(d) : addMonths(startOfMonth(d), -(o.months - 1));
    render(dir);
    return true;
  }
  function moveFocus(d, focus = true) {
    focusDate = d;
    showMonthOf(d);
    const c = setRover(d);
    if (focus && c) c.focus({ preventScroll: true });
  }
  function nav(delta) {
    view = addMonths(view, delta);
    if (!inView(focusDate)) focusDate = addMonthsKeep(focusDate, delta);
    render(delta > 0 ? 1 : -1);
  }
  function choose(d) {
    if (disabled(d)) return;
    focusDate = d;
    if (o.mode === "single") {
      o.value = d; showMonthOf(d); refresh(); setRover(d);
      const c = cellFor(d); if (c) { c.setAttribute("data-pop", ""); setTimeout(() => c.removeAttribute("data-pop"), 500); }
      o.onSelect(d);
    } else if (!picking) {
      o.start = d; o.end = null; picking = true; hover = null; showMonthOf(d); refresh(); setRover(d);
      live.textContent = `Start date ${F_SHORT.format(d)}. Choose an end date.`;
      o.onSelect({ start: d, end: null, partial: true });
    } else {
      let a = o.start, b = d; if (b < a) [a, b] = [b, a];
      o.start = a; o.end = b; picking = false; hover = null; refresh(); setRover(d);
      live.textContent = `${F_SHORT.format(a)} to ${F_SHORT.format(b)} selected.`;
      o.onSelect({ start: a, end: b });
    }
  }
  host.addEventListener("click", (e) => {
    const n = e.target.closest(".pw-cal__nav"); if (n) { nav(n.dataset.dir === "next" ? 1 : -1); return; }
    const c = e.target.closest(".pw-day"); if (c) choose(fromKey(c.dataset.date));
  });
  host.addEventListener("pointermove", (e) => {
    if (o.mode !== "range" || !picking) return;
    const c = e.target.closest(".pw-day"); if (!c) return;
    const d = fromKey(c.dataset.date); if (sameDay(d, hover)) return;
    hover = d; refresh();
  });
  host.addEventListener("pointerleave", () => { if (picking && hover) { hover = null; refresh(); } });
  host.addEventListener("keydown", (e) => {
    const cell = e.target.closest(".pw-day"); if (!cell) return;
    const d = fromKey(cell.dataset.date); let n = null;
    switch (e.key) {
      case "ArrowLeft": n = addDays(d, -1); break;
      case "ArrowRight": n = addDays(d, 1); break;
      case "ArrowUp": n = addDays(d, -7); break;
      case "ArrowDown": n = addDays(d, 7); break;
      case "Home": n = addDays(d, -((d.getDay() + 6) % 7)); break;
      case "End": n = addDays(d, 6 - ((d.getDay() + 6) % 7)); break;
      case "PageUp": n = addMonthsKeep(d, e.shiftKey ? -12 : -1); break;
      case "PageDown": n = addMonthsKeep(d, e.shiftKey ? 12 : 1); break;
      case "Enter": case " ": e.preventDefault(); choose(d); return;
      default: return;
    }
    e.preventDefault();
    if (picking && o.mode === "range") { hover = n; }
    moveFocus(n);
    if (picking && o.mode === "range") refresh();
  });
  render();
  const api = {
    el: host,
    focus() { const c = setRover(focusDate) || cellFor(view); c && c.focus({ preventScroll: true }); },
    setValue(d) { o.value = d; if (d) { focusDate = d; if (!inView(d)) { view = startOfMonth(d); render(); } } refresh(); setRover(focusDate); },
    setRange(s, e) { o.start = s; o.end = e; picking = false; if (s && !inView(s)) { view = startOfMonth(s); render(); } refresh(); },
    setMin(m) { o.min = m; render(); },
    get picking() { return picking; },
  };
  return api;
}

/* ---------- date field ---------- */
function dateField(o) {
  const id = o.id || uid();
  const presets = o.presets ? `<div class="pw-presets" role="group" aria-label="Quick due dates">${[["Today", 0], ["Tomorrow", 1], ["Next week", 7]].map(([l, n]) => { const d = addDays(TODAY, n); return `<button type="button" class="pw-preset" aria-pressed="false" data-date="${dkey(d)}">${l}<span class="num">${F_SHORT.format(d)}</span></button>`; }).join("")}</div>` : "";
  const control = `<div class="pw-control" ${o.demo ? `data-demo="${o.demo}"` : ""} ${o.disabled ? "data-disabled" : ""}>
    <input class="pw-control__input num" data-pw-input id="${id}" type="text" inputmode="numeric" autocomplete="off" placeholder="e.g. 24 Oct 2026" ${o.disabled ? "disabled" : ""} ${o.error ? 'aria-invalid="true"' : ""} ${o.req ? 'aria-required="true"' : ""} ${describedby(id)}>
    ${statusIcons}<button type="button" class="pw-iconbtn pw-datebtn" aria-label="Choose date" aria-haspopup="dialog" aria-expanded="false" ${o.disabled ? "disabled" : ""}>${icon("calendar")}</button>
  </div>`;
  return field({ id, kind: "date", ...o, tz: o.tz === false ? "" : tzTag(fromKey(o.value) || TODAY), control, after: presets, attrs: `data-value="${o.value || ""}" ${o.min ? 'data-min="today"' : ""} ${o.req ? 'data-required' : ""} ${o.attrs || ""}` });
}
INIT.date = (f) => {
  const ctl = $(".pw-control", f), input = $("input", f), btn = $(".pw-datebtn", f), presets = $$(".pw-preset", f);
  let value = fromKey(f.dataset.value), min = f.dataset.min ? TODAY : null, cal = null;
  const pop = makePop("pw-pop--cal"); pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Choose date");
  pop.innerHTML = `<div data-cal></div><div class="pw-pop__foot">${tzTag(TODAY)}<button type="button" class="pw-btn" data-variant="ghost" data-size="sm" data-today>Today</button></div>`;
  (ctl.closest("[data-theme]") && ctl.closest("[data-theme]") !== root ? ctl.closest("[data-theme]") : document.body).appendChild(pop);
  const tz = $(".pw-tz .num", f);
  const show = () => {
    input.value = value ? fmtDate(value) : ""; ctl.dataset.filled = value ? "true" : "false";
    presets.forEach((p) => p.setAttribute("aria-pressed", String(!!value && p.dataset.date === dkey(value))));
    if (tz) tz.textContent = tzName(value || TODAY);
  };
  const problem = (d) => (d === undefined ? "Enter a date like 24 Oct 2026." : d && min && d < min ? "Due date can't be in the past." : "");
  const set = (d, silent) => {
    value = d; f.dataset.value = d ? dkey(d) : ""; show(); cal && cal.setValue(d);
    const p = problem(d); if (p) setInvalid(f, p); else clearInvalid(f);
    if (!silent) emit(f, "pw:change", { value: d });
  };
  const commit = () => {
    const t = input.value.trim();
    if (!t) { value = null; f.dataset.value = ""; show(); if ("required" in f.dataset) setInvalid(f, "Choose a due date."); else clearInvalid(f); emit(f, "pw:change", { value: null }); return; }
    const d = parseDate(t);
    if (d === undefined) { setInvalid(f, problem(undefined)); return; }
    set(d);
  };
  const open = () => {
    if (input.disabled) return;
    if (!cal) cal = Calendar($("[data-cal]", pop), { mode: "single", min, value, onSelect: (d) => { set(d); Pop.close(undefined, { focus: true }); } });
    else { cal.setMin(min); cal.setValue(value); }
    Pop.open(pop, btn, { anchor: ctl, align: "start", owner: f, focusTarget: btn, estHeight: 380,
      onClose: () => { btn.setAttribute("aria-expanded", "false"); ctl.removeAttribute("data-open"); } });
    btn.setAttribute("aria-expanded", "true"); ctl.dataset.open = "true";
    requestAnimationFrame(() => cal.focus());
  };
  btn.addEventListener("click", () => (Pop.isOpen(pop) ? Pop.close(undefined, { focus: false }) : open()));
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { commit(); }
    if (e.key === "ArrowDown" && (e.altKey || !input.value)) { e.preventDefault(); open(); }
  });
  input.addEventListener("input", () => { ctl.dataset.filled = input.value ? "true" : "false"; if ("invalid" in f.dataset) { const d = parseDate(input.value); if (d !== undefined && !problem(d)) clearInvalid(f); } });
  presets.forEach((p) => p.addEventListener("click", () => set(fromKey(p.dataset.date))));
  $("[data-today]", pop).addEventListener("click", () => { set(TODAY); Pop.close(undefined, { focus: true }); });
  f._setMin = (on) => { min = on ? TODAY : null; cal && cal.setMin(min); if (value) { const p = problem(value); p ? setInvalid(f, p) : clearInvalid(f); } };
  f._pop = pop;
  show();
};

/* ---------- date range ---------- */
function rangeField(o) {
  const id = o.id || uid();
  const control = `<div class="pw-control pw-daterange" ${o.demo ? `data-demo="${o.demo}"` : ""}>
    <input class="pw-control__input num" data-pw-input id="${id}" data-i="0" type="text" inputmode="numeric" autocomplete="off" placeholder="Start date" aria-label="Start date" ${o.error ? 'aria-invalid="true"' : ""} ${describedby(id)}>
    <span class="pw-daterange__arrow" aria-hidden="true">${icon("arrow-r")}</span>
    <input class="pw-control__input num" data-pw-input id="${id}-end" data-i="1" type="text" inputmode="numeric" autocomplete="off" placeholder="End date" aria-label="End date" ${o.error ? 'aria-invalid="true"' : ""} ${describedby(id)}>
    ${statusIcons}<button type="button" class="pw-iconbtn pw-datebtn" aria-label="Choose dates" aria-haspopup="dialog" aria-expanded="false">${icon("calendar")}</button>
  </div>`;
  return field({ id, kind: "range", ...o, tz: tzTag(TODAY), control, attrs: `data-start="${o.start || ""}" data-end="${o.end || ""}"` });
}
INIT.range = (f) => {
  const ctl = $(".pw-control", f), [i0, i1] = $$("input", f), btn = $(".pw-datebtn", f);
  let s = fromKey(f.dataset.start), e = fromKey(f.dataset.end), cal = null;
  const pop = makePop("pw-pop--cal"); pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Choose dates");
  pop.innerHTML = `<div data-cal></div><div class="pw-pop__foot">${tzTag(TODAY)}<button type="button" class="pw-btn" data-variant="ghost" data-size="sm" data-clear>Clear</button></div>`;
  (ctl.closest("[data-theme]") && ctl.closest("[data-theme]") !== root ? ctl.closest("[data-theme]") : document.body).appendChild(pop);
  const show = () => { i0.value = s ? fmtDate(s) : ""; i1.value = e ? fmtDate(e) : ""; };
  const check = () => {
    if (s && e && e < s) { setInvalid(f, "End date must be after the start date."); return false; }
    clearInvalid(f); return true;
  };
  const commit = (i) => {
    const inp = i ? i1 : i0, d = parseDate(inp.value);
    if (inp.value.trim() && d === undefined) { setInvalid(f, "Enter a date like 24 Oct 2026."); return; }
    if (i) e = d || null; else s = d || null;
    show(); if (check()) cal && cal.setRange(s, e);
    emit(f, "pw:change", { start: s, end: e });
  };
  [i0, i1].forEach((inp, i) => {
    inp.addEventListener("blur", () => commit(i));
    inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") commit(i); if (ev.key === "ArrowDown" && ev.altKey) { ev.preventDefault(); open(); } });
  });
  const open = () => {
    if (!cal) cal = Calendar($("[data-cal]", pop), { mode: "range", months: innerWidth < 640 ? 1 : 2, start: s, end: e, onSelect: (r) => { if (r.partial) { s = r.start; e = null; show(); return; } s = r.start; e = r.end; show(); check(); emit(f, "pw:change", { start: s, end: e }); setTimeout(() => Pop.close(undefined, { focus: true }), 160); } });
    else cal.setRange(s, e);
    Pop.open(pop, btn, { anchor: ctl, align: "start", owner: f, focusTarget: btn, estHeight: 380, onClose: () => { btn.setAttribute("aria-expanded", "false"); ctl.removeAttribute("data-open"); } });
    btn.setAttribute("aria-expanded", "true"); ctl.dataset.open = "true";
    requestAnimationFrame(() => cal.focus());
  };
  btn.addEventListener("click", () => (Pop.isOpen(pop) ? Pop.close(undefined, { focus: false }) : open()));
  $("[data-clear]", pop).addEventListener("click", () => { s = e = null; show(); cal && cal.setRange(null, null); clearInvalid(f); });
  show();
};

/* ---------- time (segmented hours / minutes + list popover) ---------- */
const pad2 = (n) => String(n).padStart(2, "0");
function timeField(o) {
  const id = o.id || uid();
  const [h, m] = (o.value || "09:30").split(":");
  const control = `<div class="pw-control pw-time" role="group" aria-labelledby="${id}-l" ${o.demo ? `data-demo="${o.demo}"` : ""} ${o.disabled ? "data-disabled" : ""}>
    <span class="pw-control__lead">${icon("clock")}</span>
    <input class="pw-control__input pw-time__seg" data-pw-input id="${id}" data-seg="h" role="spinbutton" aria-label="Hours" aria-valuemin="0" aria-valuemax="23" inputmode="numeric" autocomplete="off" value="${h}" ${o.disabled ? "disabled" : ""} ${o.error ? 'aria-invalid="true"' : ""} ${describedby(id)}>
    <span class="pw-time__colon" aria-hidden="true">:</span>
    <input class="pw-control__input pw-time__seg" data-pw-input data-seg="m" role="spinbutton" aria-label="Minutes" aria-valuemin="0" aria-valuemax="59" inputmode="numeric" autocomplete="off" value="${m}" ${o.disabled ? "disabled" : ""} ${o.error ? 'aria-invalid="true"' : ""} ${describedby(id)}>
    <span class="pw-time__spacer"></span>${statusIcons}
    <button type="button" class="pw-iconbtn pw-timebtn" aria-label="Choose time" aria-haspopup="dialog" aria-expanded="false" ${o.disabled ? "disabled" : ""}>${icon("chev-down")}</button>
  </div>`;
  return field({ id, kind: "time", ...o, tz: tzTag(TODAY), control });
}
INIT.time = (f) => {
  const ctl = $(".pw-control", f), hI = $('[data-seg="h"]', f), mI = $('[data-seg="m"]', f), btn = $(".pw-timebtn", f);
  let h = +hI.value, m = +mI.value, buf = "";
  const pop = makePop("pw-pop--time"); pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Choose time");
  const hours = Array.from({ length: 24 }, (_, i) => i), mins = Array.from({ length: 12 }, (_, i) => i * 5);
  pop.innerHTML = `<div class="pw-timepop"><div class="pw-timecol" role="listbox" aria-label="Hours" data-col="h"><div class="pw-timecol__head" aria-hidden="true">Hour</div>${hours.map((v) => `<div class="pw-timeopt" role="option" data-v="${v}" tabindex="-1">${pad2(v)}</div>`).join("")}</div><div class="pw-timecol" role="listbox" aria-label="Minutes" data-col="m"><div class="pw-timecol__head" aria-hidden="true">Min</div>${mins.map((v) => `<div class="pw-timeopt" role="option" data-v="${v}" tabindex="-1">${pad2(v)}</div>`).join("")}</div></div><div class="pw-pop__foot">${tzTag(TODAY)}<button type="button" class="pw-btn" data-variant="ghost" data-size="sm" data-done>Done</button></div>`;
  pop.style.padding = "var(--space-2)";
  (ctl.closest("[data-theme]") && ctl.closest("[data-theme]") !== root ? ctl.closest("[data-theme]") : document.body).appendChild(pop);
  const sync = () => {
    hI.value = pad2(h); mI.value = pad2(m);
    hI.setAttribute("aria-valuenow", h); hI.setAttribute("aria-valuetext", `${pad2(h)} hours`);
    mI.setAttribute("aria-valuenow", m); mI.setAttribute("aria-valuetext", `${pad2(m)} minutes`);
    $$(".pw-timeopt", pop).forEach((o) => { const col = o.parentElement.dataset.col; const on = +o.dataset.v === (col === "h" ? h : m); o.setAttribute("aria-selected", String(on)); o.tabIndex = on ? 0 : -1; });
    emit(f, "pw:change", { value: `${pad2(h)}:${pad2(m)}` });
    clearInvalid(f);
  };
  const seg = (inp) => {
    const isH = inp === hI, max = isH ? 23 : 59;
    const get = () => (isH ? h : m), put = (v) => { v = ((v % (max + 1)) + max + 1) % (max + 1); isH ? (h = v) : (m = v); sync(); inp.select(); };
    inp.addEventListener("focus", () => { buf = ""; setTimeout(() => inp.select(), 0); });
    inp.addEventListener("blur", () => { buf = ""; sync(); });
    inp.addEventListener("pointerup", () => inp.select());
    inp.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^\d$/.test(e.key)) {
        e.preventDefault(); buf += e.key;
        const v = +buf, done = buf.length === 2 || v * 10 > max;
        isH ? (h = Math.min(v, 23)) : (m = Math.min(v, 59)); hI.value = pad2(h); mI.value = pad2(m);
        if (done) { buf = ""; sync(); if (isH) { mI.focus(); } else inp.select(); }
        else { inp.value = pad2(v); inp.select(); }
        return;
      }
      switch (e.key) {
        case "ArrowUp": e.preventDefault(); put(get() + 1); break;
        case "ArrowDown": e.preventDefault(); put(get() - 1); break;
        case "PageUp": e.preventDefault(); put(get() + 10); break;
        case "PageDown": e.preventDefault(); put(get() - 10); break;
        case "Home": e.preventDefault(); put(0); break;
        case "End": e.preventDefault(); put(max); break;
        case "ArrowRight": if (isH) { e.preventDefault(); mI.focus(); } break;
        case "ArrowLeft": if (!isH) { e.preventDefault(); hI.focus(); } break;
        case ":": case ".": e.preventDefault(); if (isH) mI.focus(); break;
        case "Backspace": case "Delete": e.preventDefault(); put(0); break;
        case "Tab": case "Enter": case "Escape": break;
        default: if (e.key.length === 1) e.preventDefault();
      }
    });
  };
  seg(hI); seg(mI);
  const scrollSel = () => $$(".pw-timecol", pop).forEach((c) => { const s = $('[aria-selected="true"]', c); if (s) c.scrollTop = s.offsetTop - c.clientHeight / 2 + s.offsetHeight / 2; });
  const open = () => {
    if (hI.disabled) return;
    sync();
    Pop.open(pop, btn, { anchor: ctl, align: "start", owner: f, focusTarget: btn, estHeight: 300, onClose: () => { btn.setAttribute("aria-expanded", "false"); ctl.removeAttribute("data-open"); } });
    btn.setAttribute("aria-expanded", "true"); ctl.dataset.open = "true";
    scrollSel(); requestAnimationFrame(() => { const s = $('.pw-timecol[data-col="h"] [aria-selected="true"]', pop); s && s.focus({ preventScroll: true }); });
  };
  btn.addEventListener("click", () => (Pop.isOpen(pop) ? Pop.close(undefined, { focus: false }) : open()));
  pop.addEventListener("click", (e) => {
    const o = e.target.closest(".pw-timeopt"); if (o) { const col = o.parentElement.dataset.col; col === "h" ? (h = +o.dataset.v) : (m = +o.dataset.v); sync(); o.focus({ preventScroll: true }); if (col === "m") setTimeout(() => Pop.close(undefined, { focus: true }), 120); else $('.pw-timecol[data-col="m"] [aria-selected="true"]', pop)?.scrollIntoView({ block: "nearest" }); }
    if (e.target.closest("[data-done]")) Pop.close(undefined, { focus: true });
  });
  pop.addEventListener("keydown", (e) => {
    const o = e.target.closest(".pw-timeopt"); if (!o) return;
    const col = o.parentElement, os = $$(".pw-timeopt", col), i = os.indexOf(o), isH = col.dataset.col === "h";
    let j = null;
    if (e.key === "ArrowDown") j = Math.min(os.length - 1, i + 1);
    else if (e.key === "ArrowUp") j = Math.max(0, i - 1);
    else if (e.key === "Home") j = 0; else if (e.key === "End") j = os.length - 1;
    else if (e.key === "ArrowRight" && isH) { e.preventDefault(); $('.pw-timecol[data-col="m"] .pw-timeopt[tabindex="0"], .pw-timecol[data-col="m"] .pw-timeopt', pop).focus(); return; }
    else if (e.key === "ArrowLeft" && !isH) { e.preventDefault(); $('.pw-timecol[data-col="h"] [aria-selected="true"]', pop).focus(); return; }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); Pop.close(undefined, { focus: true }); return; }
    if (j !== null) { e.preventDefault(); const t = os[j]; isH ? (h = +t.dataset.v) : (m = +t.dataset.v); sync(); t.focus({ preventScroll: false }); }
  });
  f._pop = pop;
  sync();
};

/* ============================ 8. number · currency ========================= */
function numberField(o) {
  const id = o.id || uid();
  const dec = o.decimals ?? (o.currency ? 2 : 0), split = !!o.split;
  const stepBtn = (dir) => `<button type="button" class="pw-step" tabindex="-1" aria-hidden="true" data-dir="${dir}" ${o.demoStep === dir ? 'data-demo="hover"' : ""}>${icon(dir < 0 ? "minus" : "plus")}</button>`;
  const control = `<div class="pw-control pw-num" ${split ? 'data-layout="split"' : ""} ${o.demo ? `data-demo="${o.demo}"` : ""} ${o.disabled ? "data-disabled" : ""}>
    ${split ? stepBtn(-1) : ""}${o.currency ? '<span class="pw-num__affix" aria-hidden="true">€</span>' : ""}
    <input class="pw-control__input" data-pw-input id="${id}" type="text" inputmode="decimal" role="spinbutton" autocomplete="off" spellcheck="false" placeholder="${esc(o.placeholder || "")}" ${o.disabled ? "disabled" : ""} ${o.error ? 'aria-invalid="true"' : ""} ${describedby(id)}>
    ${split ? "" : statusIcons}${split ? stepBtn(1) : `<span class="pw-num__steps">${stepBtn(-1)}${stepBtn(1)}</span><span class="pw-num__rate" aria-hidden="true"></span>`}
    ${split ? '<span class="pw-num__rate" aria-hidden="true"></span>' : ""}
  </div>`;
  return field({ id, kind: "number", ...o, control, attrs: `data-value="${o.value ?? ""}" data-min="${o.min ?? ""}" data-max="${o.max ?? ""}" data-step="${o.step ?? 1}" data-dec="${dec}" ${o.currency ? "data-currency" : ""} data-msg="${esc(o.msg || "")}"` });
}
INIT.number = (f) => {
  const ctl = $(".pw-control", f), input = $("input", f), steps = $$(".pw-step", f), rate = $(".pw-num__rate", f);
  const dec = +f.dataset.dec, min = f.dataset.min === "" ? -Infinity : +f.dataset.min, max = f.dataset.max === "" ? Infinity : +f.dataset.max, stepSize = +f.dataset.step || 1, cur = "currency" in f.dataset;
  const nf = new Intl.NumberFormat("en-IE", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const euro = (v) => `€${nf.format(v)}`;
  let value = f.dataset.value === "" ? null : +f.dataset.value, blurred = false;
  const msg = f.dataset.msg || (cur ? `Enter an amount between ${euro(min)} and ${euro(max)}.` : `Enter a number from ${nf.format(min)} to ${nf.format(max)}.`);
  const round = (v) => +v.toFixed(dec);
  const show = (raw) => { input.value = value == null ? "" : raw ? value.toFixed(dec) : nf.format(value); ctl.dataset.filled = value == null ? "false" : "true"; };
  const aria = () => {
    if (isFinite(min)) input.setAttribute("aria-valuemin", min); if (isFinite(max)) input.setAttribute("aria-valuemax", max);
    value == null ? (input.removeAttribute("aria-valuenow"), input.removeAttribute("aria-valuetext")) : (input.setAttribute("aria-valuenow", value), input.setAttribute("aria-valuetext", cur ? euro(value) : nf.format(value)));
    steps.forEach((b) => b.setAttribute("aria-disabled", String(!input.disabled && ((+b.dataset.dir < 0 && value != null && value <= min) || (+b.dataset.dir > 0 && value != null && value >= max)))));
    steps.forEach((b) => { if (b.getAttribute("aria-disabled") === "false") b.removeAttribute("aria-disabled"); });
    if (input.disabled) steps.forEach((b) => b.setAttribute("aria-disabled", "true"));
  };
  const parse = (t) => { const s = t.replace(/[^\d.\-]/g, ""); if (!s || s === "-" || s === ".") return null; const v = parseFloat(s); return isNaN(v) ? null : v; };
  const validate = () => {
    if (value == null) { clearInvalid(f); return; }
    value < min || value > max ? setInvalid(f, msg) : clearInvalid(f);
  };
  const setValue = (v, { raw = document.activeElement === input, animate: a = true, dir = 0 } = {}) => {
    value = v == null ? null : round(v); show(raw); aria();
    if (a && dir && motionOK()) animate(input, [{ transform: `translateY(${-dir * 3}px)`, opacity: .55 }, { transform: "none", opacity: 1 }], { dur: "--duration-fast", ease: "--ease-standard" });
    if (blurred || "invalid" in f.dataset) validate();
    emit(f, "pw:change", { value });
  };
  const bump = (dir, mult = 1, quiet) => {
    const base = value == null ? (isFinite(min) ? min - (dir > 0 ? stepSize * mult : -stepSize * mult) * 0 : 0) : value;
    let next = value == null ? (isFinite(min) ? min : 0) : base + dir * stepSize * mult;
    next = clamp(next, min, max);
    setValue(next, { dir: quiet ? 0 : dir });
  };
  /* keyboard */
  input.addEventListener("keydown", (e) => {
    if (input.disabled) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const big = 10;
    switch (e.key) {
      case "ArrowUp": e.preventDefault(); bump(1, e.shiftKey ? big : 1); return;
      case "ArrowDown": e.preventDefault(); bump(-1, e.shiftKey ? big : 1); return;
      case "PageUp": e.preventDefault(); bump(1, big); return;
      case "PageDown": e.preventDefault(); bump(-1, big); return;
      case "Home": if (isFinite(min)) { e.preventDefault(); setValue(min); } return;
      case "End": if (isFinite(max)) { e.preventDefault(); setValue(max); } return;
      case "Enter": commit(); return;
    }
    if (e.key.length === 1 && !/[\d.,\-]/.test(e.key)) e.preventDefault();
  });
  const commit = () => { const v = parse(input.value); value = v == null ? null : round(v); show(document.activeElement === input); aria(); validate(); emit(f, "pw:change", { value }); };
  input.addEventListener("focus", () => { show(true); setTimeout(() => input.select(), 0); });
  input.addEventListener("blur", () => { blurred = true; const v = parse(input.value); value = v == null ? null : round(v); show(false); aria(); validate(); });
  input.addEventListener("input", () => { ctl.dataset.filled = input.value ? "true" : "false"; const v = parse(input.value); if (v != null) { value = v; aria(); } if (blurred || "invalid" in f.dataset) validate(); });
  /* press-and-hold stepper with acceleration */
  let timer = null, holdBtn = null;
  const stopHold = () => { clearTimeout(timer); timer = null; if (holdBtn) { holdBtn.removeAttribute("data-holding"); holdBtn = null; } if (rate) rate.removeAttribute("data-on"); };
  steps.forEach((b) => {
    b.addEventListener("pointerdown", (e) => {
      if (input.disabled || b.getAttribute("aria-disabled") === "true" || e.button) return;
      e.preventDefault(); b.setPointerCapture(e.pointerId); holdBtn = b; b.dataset.holding = "";
      const dir = +b.dataset.dir, t0 = performance.now(); let n = 0;
      const mult = () => { const t = performance.now() - t0; return t > 3200 ? 10 : t > 2000 ? 5 : t > 1000 ? 2 : 1; };
      bump(dir, 1);
      const tick = () => {
        if (b.getAttribute("aria-disabled") === "true") { stopHold(); return; }
        const mu = mult(); bump(dir, mu, mu > 1);
        if (rate) { rate.textContent = `×${mu}`; mu > 1 ? rate.setAttribute("data-on", "") : rate.removeAttribute("data-on"); }
        n++; timer = setTimeout(tick, Math.max(tokMs("--stepper-interval-min"), tokMs("--stepper-interval") * Math.pow(0.95, n)));
      };
      timer = setTimeout(tick, tokMs("--stepper-delay"));
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => b.addEventListener(ev, stopHold));
  });
  f._set = (v) => setValue(v, { raw: false, animate: false });
  setValue(value, { raw: false, animate: false });
  if (f.hasAttribute("data-invalid")) blurred = true;
};

/* ====== 9. checkbox · radio · switch · segmented control · slider ========== */
const tickSvg = '<svg viewBox="0 0 12 12" aria-hidden="true"><path class="tick" d="M2.5 6.25l2.25 2.25L9.5 3.5" pathLength="1"/><path class="dash" d="M3 6h6" pathLength="1"/></svg>';
function checkbox(o) {
  return `<label class="pw-check" ${o.tone ? `data-tone="${o.tone}"` : ""} ${o.demo ? `data-demo="${o.demo}"` : ""} ${o.invalid ? "data-invalid" : ""}>
    <input class="pw-check__input" type="checkbox" ${o.checked ? "checked" : ""} ${o.disabled ? "disabled" : ""} ${o.indeterminate ? "data-indeterminate" : ""} ${o.invalid ? 'aria-invalid="true"' : ""} ${o.name ? `name="${o.name}"` : ""} ${o.attrs || ""}>
    <span class="pw-check__box" aria-hidden="true">${tickSvg}</span>
    <span class="pw-check__text"><span class="pw-check__label">${o.label}</span>${o.desc ? `<span class="pw-check__desc">${esc(o.desc)}</span>` : ""}</span></label>`;
}
function radioGroup(o) {
  const name = o.name || uid("rg");
  return `<fieldset class="pw-choices" ${o.dir ? `data-dir="${o.dir}"` : ""} ${o.invalid ? 'aria-invalid="true"' : ""} role="radiogroup" ${o.legend ? "" : `aria-label="${esc(o.aria || "Options")}"`}>
    ${o.legend ? `<legend class="pw-choices__legend">${esc(o.legend)}</legend>` : ""}
    ${o.options.map((p) => `<label class="pw-radio" ${p.demo ? `data-demo="${p.demo}"` : ""} ${o.invalid ? "data-invalid" : ""}>
      <input class="pw-radio__input" type="radio" name="${name}" value="${p.value}" ${p.value === o.value ? "checked" : ""} ${p.disabled || o.disabled ? "disabled" : ""}>
      <span class="pw-radio__box" aria-hidden="true"></span>
      <span class="pw-radio__text"><span class="pw-check__label">${esc(p.label)}</span>${p.desc ? `<span class="pw-check__desc">${esc(p.desc)}</span>` : ""}</span></label>`).join("")}
  </fieldset>`;
}
function switchCtl(o) {
  return `<label class="pw-switch ${o.lead ? "pw-switch--lead" : ""}" ${o.demo ? `data-demo="${o.demo}"` : ""} ${o.busy ? "data-busy" : ""} ${o.async ? 'data-pw="switch"' : ""}>
    <input class="pw-switch__input" type="checkbox" role="switch" ${o.checked ? "checked" : ""} ${o.disabled ? "disabled" : ""} ${o.busy ? 'aria-busy="true"' : ""} ${o.attrs || ""}>
    <span class="pw-switch__track" aria-hidden="true"><span class="pw-switch__thumb"></span></span>
    <span class="pw-switch__text"><span class="pw-check__label">${o.label}</span>${o.desc ? `<span class="pw-check__desc">${esc(o.desc)}</span>` : ""}</span></label>`;
}
INIT.checkgroup = (g) => {
  const parent = $("[data-parent]", g), kids = $$("[data-child]", g);
  const sync = () => { const n = kids.filter((k) => k.checked).length; parent.checked = n === kids.length; parent.indeterminate = n > 0 && n < kids.length; const c = $("[data-count]", g); if (c) c.textContent = `${n} of ${kids.length} done`; };
  parent.addEventListener("change", () => { kids.forEach((k) => { if (k.checked !== parent.checked) { k.checked = parent.checked; pop(k); } }); sync(); });
  kids.forEach((k) => k.addEventListener("change", sync));
  sync();
};
const pop = (input) => { const box = input.nextElementSibling; if (!box) return; box.setAttribute("data-pop", ""); box.addEventListener("animationend", () => box.removeAttribute("data-pop"), { once: true }); };
document.addEventListener("change", (e) => { const t = e.target; if (t.matches && t.matches(".pw-check__input, .pw-radio__input") && motionOK()) { if (t.type === "radio") $$(`.pw-radio__input[name="${t.name}"]`).forEach((r) => r.checked && pop(r)); else pop(t); } });
document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches && e.target.matches(".pw-switch__input")) { e.preventDefault(); e.target.click(); } });
INIT.switch = (lbl) => {
  const input = $("input", lbl);
  input.addEventListener("change", () => {
    lbl.setAttribute("data-busy", ""); input.setAttribute("aria-busy", "true");
    setTimeout(() => { lbl.removeAttribute("data-busy"); input.removeAttribute("aria-busy"); }, 1100);
  });
};
function initFlags(scope) { $$("[data-indeterminate]", scope).forEach((i) => (i.indeterminate = true)); }

/* ---- segmented control ---- */
function segmented(o) {
  const id = o.id || uid("seg");
  return `<div class="pw-seg" data-pw="seg" ${o.size ? `data-size="${o.size}"` : ""} ${o.block ? "data-block" : ""} ${o.disabled ? "data-disabled" : ""} role="radiogroup" aria-label="${esc(o.label)}" ${o.attrs || ""}>
    <span class="pw-seg__thumb" aria-hidden="true"></span>
    ${o.options.map((p) => `<button type="button" class="pw-seg__btn" role="radio" data-value="${p.value}" aria-checked="${p.value === o.value}" ${o.disabled || p.disabled ? 'aria-disabled="true"' : ""} ${p.demo ? `data-demo="${p.demo}"` : ""}>${p.icon ? icon(p.icon) : ""}<span class="lbl">${esc(p.label)}</span></button>`).join("")}
  </div>`;
}
INIT.seg = (seg) => {
  const btns = $$('[role="radio"]', seg), thumb = $(".pw-seg__thumb", seg);
  const place = (anim) => {
    const on = btns.find((b) => b.getAttribute("aria-checked") === "true"); if (!on || !on.offsetWidth) return;
    if (!anim) thumb.style.transition = "none";
    thumb.style.width = `${on.offsetWidth}px`; thumb.style.transform = `translateX(${on.offsetLeft}px)`;
    if (!anim) { void thumb.offsetWidth; thumb.style.transition = ""; }
  };
  const select = (b, focus) => {
    if (b.getAttribute("aria-disabled") === "true" || seg.hasAttribute("data-disabled")) return;
    btns.forEach((x) => { const on = x === b; x.setAttribute("aria-checked", String(on)); x.tabIndex = on ? 0 : -1; });
    place(true); if (focus) b.focus(); emit(seg, "pw:change", { value: b.dataset.value });
  };
  btns.forEach((b) => (b.tabIndex = b.getAttribute("aria-checked") === "true" ? 0 : -1));
  if (!btns.some((b) => b.tabIndex === 0)) btns[0].tabIndex = 0;
  seg.addEventListener("click", (e) => { const b = e.target.closest('[role="radio"]'); if (b) select(b); });
  seg.addEventListener("keydown", (e) => {
    const en = btns.filter((b) => b.getAttribute("aria-disabled") !== "true"), i = en.indexOf(document.activeElement); if (i < 0) return;
    let n = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = en[(i + 1) % en.length];
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = en[(i - 1 + en.length) % en.length];
    else if (e.key === "Home") n = en[0]; else if (e.key === "End") n = en[en.length - 1];
    if (n) { e.preventDefault(); select(n, true); }
  });
  place(false);
  seg._place = place;
  if ("ResizeObserver" in window) new ResizeObserver(() => place(false)).observe(seg);
  if (document.fonts) document.fonts.ready.then(() => place(false));
};

/* ---- slider ---- */
const SL_FMT = {
  percent: { f: (v) => `${v}%`, t: (v) => `${v}% confidence` },
  euro: { f: (v) => `€${new Intl.NumberFormat("en-IE").format(v)}`, t: (v) => `${new Intl.NumberFormat("en-IE").format(v)} euros` },
  num: { f: (v) => String(v), t: (v) => String(v) },
};
function sliderField(o) {
  const id = o.id || uid("sl"), fmt = o.fmt || "num", F = SL_FMT[fmt], vals = o.range || [o.value];
  const lab = o.labels || (o.range ? ["Minimum", "Maximum"] : [o.label]);
  return `<div class="pw-slider-field">
    <div class="pw-slider-field__head"><span class="pw-field__label" id="${id}-l">${esc(o.label)}</span><output class="pw-slider-field__value" for="${id}" id="${id}-o" data-out>${vals.map((v) => F.f(v)).join(" – ")}</output></div>
    <div class="pw-slider" data-pw="slider" id="${id}" data-min="${o.min}" data-max="${o.max}" data-step="${o.step || 1}" data-values="${vals.join(",")}" data-fmt="${fmt}" ${o.tone ? `data-tone="${o.tone}"` : ""} ${o.disabled ? "data-disabled" : ""} ${o.bubble ? "data-bubble" : ""}>
      <div class="pw-slider__rail"><div class="pw-slider__fill"></div></div>
      ${vals.map((v, i) => `<div class="pw-slider__thumb" role="slider" tabindex="${o.disabled ? -1 : 0}" aria-labelledby="${id}-l" ${vals.length > 1 ? `aria-label="${lab[i]}"` : ""} ${o.disabled ? 'aria-disabled="true"' : ""} ${o.demoThumb ? `data-demo="${o.demoThumb}"` : ""}><span class="pw-slider__bubble" aria-hidden="true"></span></div>`).join("")}
    </div>
    <div class="pw-slider__scale" aria-hidden="true"><span>${F.f(o.min)}</span><span>${F.f(o.max)}</span></div>
  </div>`;
}
INIT.slider = (s) => {
  const min = +s.dataset.min, max = +s.dataset.max, step = +s.dataset.step, F = SL_FMT[s.dataset.fmt];
  const rail = $(".pw-slider__rail", s), thumbs = $$(".pw-slider__thumb", s), out = $("[data-out]", s.parentElement);
  const vals = s.dataset.values.split(",").map(Number), range = vals.length > 1;
  const labelId = thumbs[0].getAttribute("aria-labelledby");
  const pOf = (v) => (v - min) / (max - min);
  const snap = (v) => clamp(Math.round((v - min) / step) * step + min, min, max);
  const width = () => s.style.setProperty("--_w", `${rail.clientWidth}px`);
  const render = () => {
    thumbs.forEach((t, i) => {
      t.style.setProperty("--p", pOf(vals[i]));
      t.setAttribute("aria-valuemin", i && range ? vals[0] : min); t.setAttribute("aria-valuemax", !i && range ? vals[1] : max);
      t.setAttribute("aria-valuenow", vals[i]); t.setAttribute("aria-valuetext", F.t(vals[i]));
      $(".pw-slider__bubble", t).textContent = F.f(vals[i]);
    });
    s.style.setProperty("--p0", range ? pOf(vals[0]) : 0); s.style.setProperty("--p1", pOf(vals[vals.length - 1]));
    if (out) out.textContent = vals.map((v) => F.f(v)).join(" – ");
  };
  const set = (i, v, silent) => {
    v = snap(v); if (range) v = i === 0 ? Math.min(v, vals[1]) : Math.max(v, vals[0]);
    if (v === vals[i]) return; vals[i] = v; render(); if (!silent) emit(s, "pw:change", { values: [...vals] });
  };
  const fromX = (x) => { const r = rail.getBoundingClientRect(); return min + clamp((x - r.left) / r.width, 0, 1) * (max - min); };
  let drag = -1;
  s.addEventListener("pointerdown", (e) => {
    if (s.hasAttribute("data-disabled") || e.button) return;
    e.preventDefault();
    const v = fromX(e.clientX);
    let i = 0;
    if (range) { const d0 = Math.abs(v - vals[0]), d1 = Math.abs(v - vals[1]); i = d0 < d1 ? 0 : d1 < d0 ? 1 : v < vals[0] ? 0 : 1; }
    drag = i; s.setPointerCapture(e.pointerId); s.setAttribute("data-dragging", "");
    thumbs.forEach((t, k) => (k === i ? t.setAttribute("data-active", "") : t.removeAttribute("data-active")));
    thumbs[i].focus({ preventScroll: true }); set(i, v);
  });
  s.addEventListener("pointermove", (e) => { if (drag >= 0) set(drag, fromX(e.clientX)); });
  const end = () => { drag = -1; s.removeAttribute("data-dragging"); thumbs.forEach((t) => t.removeAttribute("data-active")); };
  s.addEventListener("pointerup", end); s.addEventListener("pointercancel", end);
  thumbs.forEach((t, i) => t.addEventListener("keydown", (e) => {
    if (s.hasAttribute("data-disabled")) return;
    const big = step * 10; let v = vals[i];
    switch (e.key) {
      case "ArrowRight": case "ArrowUp": v += step; break;
      case "ArrowLeft": case "ArrowDown": v -= step; break;
      case "PageUp": v += big; break; case "PageDown": v -= big; break;
      case "Home": v = range && i ? vals[0] : min; break; case "End": v = range && !i ? vals[1] : max; break;
      default: return;
    }
    e.preventDefault(); set(i, v);
  }));
  if ("ResizeObserver" in window) new ResizeObserver(() => { width(); }).observe(rail);
  width(); render();
  s._vals = vals;
};

/* ============================ 10. file drop zone =========================== */
const MAX_MB = 20;
const sizeLabel = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
function fileRow({ name, bytes, state = "uploading", progress = 0, error = "", id = uid("fl") }) {
  const meta = state === "error" ? `${icon("alert", "pw-icon", 'data-size="sm"')}<span>${esc(error)}</span>` : state === "done" ? `<span class="num">${sizeLabel(bytes)}</span><span>· Uploaded</span>` : `<span class="num">${sizeLabel(bytes)}</span><span class="num" data-pct>· ${Math.round(progress * 100)}%</span>`;
  return `<div class="pw-file" data-state="${state}" data-id="${id}" data-new>
    <span class="pw-file__icon">${icon("file")}${icon("check", "pw-icon", 'data-state="done"')}${icon("alert", "pw-icon", 'data-state="error"')}</span>
    <div class="pw-file__main"><span class="pw-file__name" title="${esc(name)}">${esc(name)}</span><span class="pw-file__meta" data-meta>${meta}</span></div>
    <div class="pw-file__actions"><button type="button" class="pw-iconbtn" data-act="remove" aria-label="${state === "uploading" ? "Cancel upload of" : "Remove"} ${esc(name)}">${icon(state === "uploading" ? "x" : "trash")}</button></div>
    <div class="pw-file__prog"><div><div class="pw-progress" role="progressbar" aria-label="Uploading ${esc(name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress * 100)}"><i style="--p:${progress}"></i></div></div></div>
  </div>`;
}
function dropField(o) {
  const id = o.id || uid();
  const control = `<div class="pw-drop" ${o.state ? `data-state="${o.state}"` : ""} ${o.disabled ? 'aria-disabled="true"' : ""} ${o.invalid ? "data-invalid" : ""} ${o.demo ? `data-demo="${o.demo}"` : ""}>
    <svg class="pw-drop__border" aria-hidden="true"><rect/></svg>
    <span class="pw-drop__icon" aria-hidden="true">${icon("upload")}</span>
    <p class="pw-drop__title" id="${id}-t">${o.state === "dragover" ? "Drop to upload" : "Drag a PDF here"}</p>
    <p class="pw-drop__hint" id="${id}-hh">${o.invalid ? "PDF up to 20 MB." : "PDF up to 20 MB."}</p>
    <button type="button" class="pw-btn" data-variant="secondary" data-size="sm" id="${id}" data-pw-input aria-describedby="${id}-t ${id}-hh" ${o.disabled ? "disabled" : ""}>Choose file</button>
    <input type="file" accept="application/pdf,.pdf" multiple hidden tabindex="-1">
  </div>
  <div class="pw-files" aria-live="polite">${(o.files || []).map(fileRow).join("")}</div>`;
  return field({ id: id + "x", kind: "drop", ...o, label: o.label, head: true, control: control.replace(`for="${id}"`, ""), attrs: "" });
}
INIT.drop = (f) => {
  const zone = $(".pw-drop", f), pick = $(".pw-btn", zone), input = $('input[type="file"]', zone), list = $(".pw-files", f), title = $(".pw-drop__title", zone), hint = $(".pw-drop__hint", zone);
  const label = $(".pw-field__label", f); if (label) label.removeAttribute("for"), label.addEventListener("click", () => pick.focus());
  const disabled = () => zone.getAttribute("aria-disabled") === "true";
  const sims = new Map();
  function sim(row) {
    let p = 0; const bar = $(".pw-progress", row), fill = $("i", bar), pct = $("[data-pct]", row), meta = $("[data-meta]", row);
    const bytes = +row.dataset.bytes;
    const t = setInterval(() => {
      if (!row.isConnected) { clearInterval(t); return; }
      p = Math.min(1, p + 0.04 + Math.random() * 0.1);
      fill.style.setProperty("--p", p); bar.setAttribute("aria-valuenow", Math.round(p * 100)); if (pct) pct.textContent = `· ${Math.round(p * 100)}%`;
      if (p >= 1) { clearInterval(t); sims.delete(row); row.dataset.state = "done"; meta.innerHTML = `<span class="num">${sizeLabel(bytes)}</span><span>· Uploaded</span>`; const b = $('[data-act="remove"]', row); b.innerHTML = icon("trash"); b.setAttribute("aria-label", `Remove ${row.dataset.name}`); }
    }, 140);
    sims.set(row, t);
  }
  function add(file) {
    const bad = !(/\.pdf$/i.test(file.name) || file.type === "application/pdf") ? "Only PDF files are accepted. PDF up to 20 MB." : file.size > MAX_MB * 1048576 ? `File is too large (${sizeLabel(file.size)}). PDF up to ${MAX_MB} MB.` : "";
    const html = bad ? fileRow({ name: file.name, bytes: file.size, state: "error", error: bad }) : fileRow({ name: file.name, bytes: file.size, state: "uploading", progress: 0 });
    flip(list, () => list.insertAdjacentHTML("afterbegin", html));
    const row = list.firstElementChild; row.dataset.bytes = file.size; row.dataset.name = file.name;
    row.addEventListener("animationend", () => row.removeAttribute("data-new"), { once: true });
    if (!bad) sim(row); else { zone.setAttribute("data-invalid", ""); clearTimeout(zone._t); zone._t = setTimeout(() => zone.removeAttribute("data-invalid"), 2200); }
  }
  f._add = add;
  zone.addEventListener("dragenter", (e) => { if (disabled()) return; e.preventDefault(); zone.dataset.state = "dragover"; title.textContent = "Drop to upload"; });
  zone.addEventListener("dragover", (e) => { if (disabled()) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; });
  zone.addEventListener("dragleave", (e) => { if (!zone.contains(e.relatedTarget)) { delete zone.dataset.state; title.textContent = "Drag a PDF here"; } });
  zone.addEventListener("drop", (e) => { e.preventDefault(); delete zone.dataset.state; title.textContent = "Drag a PDF here"; if (disabled()) return; [...(e.dataTransfer?.files || [])].forEach(add); });
  pick.addEventListener("click", () => input.click());
  input.addEventListener("change", () => { [...input.files].forEach(add); input.value = ""; });
  list.addEventListener("click", (e) => {
    const b = e.target.closest('[data-act="remove"]'); if (!b) return;
    const row = b.closest(".pw-file"); clearInterval(sims.get(row)); sims.delete(row);
    row.setAttribute("data-leaving", "");
    setTimeout(() => flip(list, () => row.remove()), tokMs("--duration-base") * 0.7 - 10);
    pick.focus();
  });
  $$("[data-sample]", f).forEach((b) => b.addEventListener("click", () => {
    const s = { lease: { name: "lease-agreement.pdf", size: 2.4 * 1048576, type: "application/pdf" }, scan: { name: "key-handover.png", size: 3.1 * 1048576, type: "image/png" }, big: { name: "inspection-report.pdf", size: 34 * 1048576, type: "application/pdf" } }[b.dataset.sample];
    add(s);
  }));
  $$(".pw-file[data-state='uploading']", f).forEach((r) => { r.dataset.bytes = r.dataset.bytes || 2516582; r.dataset.name = r.dataset.name || ""; if (r.hasAttribute("data-live")) sim(r); });
};

/* ================== 11. patterns: timing · launch form ===================== */
const spinnerSvg = '<svg class="pw-spinner" viewBox="0 0 16 16" aria-hidden="true"><circle class="track" cx="8" cy="8" r="6" pathLength="1"/><circle class="arc" cx="8" cy="8" r="6" pathLength="1"/></svg>';
const launchBtn = (data = "") => `<button type="submit" class="pw-btn" data-variant="primary" data-launch ${data}><span class="pw-btn__slot">${icon("arrow-r")}${spinnerSvg}</span><span class="pw-btn__labels"><span data-idle>Launch</span><span data-busy>Launching…</span></span></button>`;
const TASKS = ["Sign the lease agreement", "Inspect the apartment", "Order cleaning", "Hand over the keys", "Record meter readings"];

function launchForm() {
  const nameId = uid();
  return `<form class="pw-form" data-pw="launch" novalidate aria-label="Launch a template">
    <div class="pw-form__head"><div><h3>Launch a template</h3><p>Tenant move-in · 5 tasks · 2 sections</p></div><span class="pw-tag">Template</span></div>
    ${textField({ id: nameId, label: "Case name", req: true, placeholder: "Apartment 12, move-in", hint: "Shown on the run card and in notifications.", clear: true, counter: 100, attrs: 'data-max="100" data-validate="caseName" data-clear-esc', inputAttrs: 'autocomplete="off" name="case"' })}
    <div class="pw-tasks" role="group" aria-label="Assign tasks">
      <div class="pw-tasks__head"><b>Assign tasks</b><span>Optional — you can assign later</span></div>
      ${TASKS.map((t, i) => `<div class="pw-task"><div class="pw-task__name"><span class="pw-task__idx num" aria-hidden="true">${i + 1}</span><span>${esc(t)}</span></div>${comboField({ source: "users", size: "sm", head: false, srLabel: `Assignee for ${t}`, placeholder: "Unassigned" })}</div>`).join("")}
    </div>
    <div class="pw-banner" data-banner hidden role="status">${icon("check-circle")}<span><b data-banner-title>Run launched.</b> <span data-banner-text></span></span></div>
    <div class="pw-form__foot"><span class="pw-form__summary" data-summary aria-live="polite"></span><div class="pw-form__actions"><button type="button" class="pw-btn" data-variant="ghost" data-reset>Reset</button>${launchBtn()}</div></div>
  </form>`;
}
INIT.launch = (form) => {
  const nameF = $('[data-pw="text"]', form), nameIn = $("input", nameF), combos = $$('[data-pw="combo"]', form);
  const btn = $("[data-launch]", form), banner = $("[data-banner]", form), summary = $("[data-summary]", form);
  const upd = () => {
    const n = combos.filter((c) => c.dataset.value).length;
    summary.innerHTML = `<b class="num">${n}</b> of ${combos.length} tasks assigned · <span class="num">${combos.length - n}</span> unassigned`;
  };
  form.addEventListener("pw:change", upd);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (btn.getAttribute("aria-busy") === "true") return;
    if (!nameF._validate()) { nameIn.focus(); return; }
    banner.hidden = true;
    btn.setAttribute("aria-busy", "true");
    setTimeout(() => {
      btn.removeAttribute("aria-busy");
      $("[data-banner-title]", banner).textContent = "Run launched.";
      $("[data-banner-text]", banner).textContent = `“${nameIn.value.trim()}” is in progress. ${combos.filter((c) => c.dataset.value).length} of ${combos.length} tasks are assigned.`;
      banner.hidden = false; banner.setAttribute("data-enter", ""); banner.addEventListener("animationend", () => banner.removeAttribute("data-enter"), { once: true });
    }, 1500);
  });
  $("[data-reset]", form).addEventListener("click", () => { nameF._reset(); combos.forEach((c) => c._set("")); banner.hidden = true; upd(); });
  upd();
};

function timingDemo() {
  return `<div class="pw-card" data-pw="timing">
    ${textField({ label: "Contact email", req: true, placeholder: "tenant@example.test", hint: "We only validate after you leave the field — then fix errors as you type.", attrs: 'data-validate="email" data-show-valid data-ok-msg="Looks good." data-msg-required="Enter an email address."', inputAttrs: 'type="email" autocomplete="off" inputmode="email"', clear: true })}
    <div class="pw-phases" role="list" aria-label="Validation timing">
      <div class="pw-phase" role="listitem" data-phase="idle" aria-current="step"><b>1 · Stay quiet</b><span>No errors while typing the first time</span></div>
      <div class="pw-phase" role="listitem" data-phase="blur"><b>2 · On blur</b><span>Validate once, when focus leaves</span></div>
      <div class="pw-phase" role="listitem" data-phase="live"><b>3 · Then live</b><span>Re-check on every keystroke</span></div>
    </div>
    <div class="split"><span class="pw-readout" data-readout>Type, then Tab away. Try “tenant@”.</span><button type="button" class="pw-btn" data-variant="ghost" data-size="sm" data-reset>Reset demo</button></div>
  </div>`;
}
INIT.timing = (c) => {
  const f = $('[data-pw="text"]', c), out = $("[data-readout]", c);
  const msgs = { idle: "Pristine — nothing shown yet.", blur: "Blurred — validated once.", live: "Live — re-validating on input." };
  f.addEventListener("pw:phase", (e) => {
    $$(".pw-phase", c).forEach((p) => (p.dataset.phase === e.detail.phase ? p.setAttribute("aria-current", "step") : p.removeAttribute("aria-current")));
    out.textContent = msgs[e.detail.phase];
  });
  $("[data-reset]", c).addEventListener("click", () => { f._reset(); $$(".pw-phase", c).forEach((p) => (p.dataset.phase === "idle" ? p.setAttribute("aria-current", "step") : p.removeAttribute("aria-current"))); out.textContent = msgs.idle; });
};

/* ============================ 12. gallery ================================== */
const panel = (theme, inner, cap) => `<section class="theme-panel" data-theme="${theme}" aria-label="${theme === "light" ? "Light" : "Dark"} theme"><div class="panel-cap"><b>${theme === "light" ? "Light" : "Dark"}</b><span>${cap || ""}</span></div><div class="stage">${inner}</div></section>`;
const row = (cap, inner, center) => `<div class="row" ${center ? 'data-align="center"' : ""}><div class="cap">${cap}</div><div style="min-width:0">${inner}</div></div>`;
const duo = (fn, cap) => ["light", "dark"].map((t) => panel(t, fn(t), cap)).join("");
const cluster = (html, gap = 24) => `<div class="cluster" style="--gap:${gap}px">${html}</div>`;

/* A frozen, inline rendering of an open listbox */
const staticPop = (inner, label) => `<div class="pw-pop" data-static><div class="pw-lb"><span class="pw-lb__hl" aria-hidden="true"></span>${inner}</div></div>`;
const staticList = (opts, label) => `<div class="pw-lb__list" role="listbox" aria-label="${esc(label)}">${opts}</div>`;
const SEC = {};

SEC.text = (t) => [
  row("default", textField({ label: "Case name", req: true, placeholder: "Apartment 12, move-in", hint: "Shown on the run card and in notifications.", clear: true, counter: 100, attrs: 'data-max="100" data-validate="caseName" data-clear-esc' })),
  row("filled", textField({ label: "Case name", req: true, value: "Apartment 12, move-in", hint: "Shown on the run card and in notifications.", clear: true, counter: 100, attrs: 'data-max="100" data-validate="caseName" data-clear-esc' })),
  row("leading icon", textField({ label: "Search tasks", lead: "search", placeholder: "Search tasks…", clear: true, hint: "Matches task names and assignees.", attrs: "data-clear-esc", inputAttrs: 'type="search"' })),
  row("hover", textField({ label: "Tenant email", placeholder: "tenant@example.test", demo: "hover", opt: true })),
  row("focus", textField({ label: "Tenant email", value: "tenant@example.test", demo: "focus", opt: true, clear: true })),
  row("disabled", textField({ label: "Unit", value: "Apartment 12", disabled: true, hint: "Set by the template." })),
  row("read-only", textField({ label: "Run ID", value: "INV-2026-0142", readonly: true, lead: "lock", hint: "Generated on launch." })),
  row("invalid", textField({ label: "Case name", req: true, value: "", placeholder: "Apartment 12, move-in", error: "Enter a case name.", counter: 100, attrs: 'data-max="100" data-validate="caseName"' })),
  row("loading", textField({ label: "Case name", req: true, value: "Apartment 12, move-in", hint: "Checking that the name is available…", attrs: "data-loading" })),
  row("success", textField({ label: "Contact email", req: true, value: "tenant@example.test", attrs: 'data-valid data-note="ok" data-validate="email" data-show-valid', noteText: "Looks good.", hint: "We’ll send the welcome email here." })),
  `<hr class="row-sep">`,
  row("textarea", textareaField({ label: "Notes", opt: true, placeholder: "Anything the assignee should know…", hint: "Grows with your text, up to six lines.", counter: 500, attrs: 'data-max="500"', value: "Tenant arrives at 15:00.\nKeys are in the lockbox at the front door.\nPlease photograph the meters on arrival." })),
  row("textarea · invalid", textareaField({ label: "Notes", req: true, error: "Add a note so the next person knows what to do.", placeholder: "Anything the assignee should know…" })),
].join("");

SEC.password = (t) => [
  row("default", passwordField({ label: "Password", req: true, placeholder: "At least 12 characters", hint: "Use 12 or more characters.", attrs: 'data-validate="password" data-keep-note' })),
  row("revealed", passwordField({ label: "Password", req: true, value: "Tenant-keys-2026!", revealed: true })),
  row("caps lock", passwordField({ label: "Password", req: true, value: "TENANTKEYS2026", attrs: 'data-note="caps" data-keep-note', noteText: "Caps Lock is on." })),
  row("hover", passwordField({ label: "Password", value: "Tenant-keys-2026!", revealDemo: "hover" })),
  row("focus", passwordField({ label: "Password", value: "Tenant-keys-2026!", demo: "focus" })),
  row("invalid", passwordField({ label: "Password", value: "short", error: "Use at least 12 characters." })),
  row("disabled", passwordField({ label: "Password", value: "Tenant-keys-2026!", disabled: true })),
].join("");

const staticUnitOptions = (selId, activeId) => { let i = 0; const o = (it) => `<div class="pw-opt" role="option" data-rich id="${uid("so")}" aria-selected="${it.id === selId}" ${it.id === activeId ? "data-active" : ""} ${it.disabled ? 'aria-disabled="true"' : ""}><span class="pw-opt__body"><span class="pw-opt__label">${it.label}</span><span class="pw-opt__desc">${it.desc}</span></span><span class="pw-opt__trail"><span class="pw-opt__check">${icon("check")}</span></span></div>`;
  return UNITS.map((g, gi) => `<div class="pw-group" role="group" aria-label="${g.group}"><div class="pw-group__label">${g.group}</div>${g.items.map(o).join("")}</div>`).join(""); };
const staticStatusOptions = () => STATUSES.map((s, i) => `<div class="pw-opt" role="option" id="${uid("so")}" aria-selected="${s.id === "progress"}" ${s.id === "done" ? "data-active" : ""}><span class="pw-dot" data-status="${s.dot}"></span><span class="pw-opt__body"><span class="pw-opt__label">${s.label}</span></span><span class="pw-opt__trail"><span class="pw-opt__check">${icon("check")}</span></span></div>`).join("");
const staticUsers = (list, o = {}) => list.map((u, i) => userOption(u, { q: o.q || "", selected: u.id === o.selected, i, id: uid("so"), active: u.id === o.active, multi: o.multi })).join("");
const U = (id) => COMBO_SRC.users.items.find((x) => x.id === id);

SEC.select = (t) => [
  row("default", selectField({ label: "Unit type", req: true, placeholder: "Select a unit type", hint: "Picks the checklist that fits the unit.", source: "units" })),
  row("filled", selectField({ label: "Unit type", req: true, value: "apartment", hint: "Picks the checklist that fits the unit.", source: "units" })),
  row("hover", selectField({ label: "Unit type", placeholder: "Select a unit type", demo: "hover" })),
  row("focus", selectField({ label: "Unit type", value: "house", demo: "focus" })),
  row("disabled", selectField({ label: "Unit type", value: "apartment", disabled: true, hint: "Locked after launch." })),
  row("invalid", selectField({ label: "Unit type", req: true, placeholder: "Select a unit type", error: "Select a unit type.", attrs: 'data-required' })),
  row("loading", selectField({ label: "Template", placeholder: "Loading templates…", loading: true, hint: "Fetching templates from your workspace…" })),
  row("status dots", selectField({ label: "Status", source: "status", value: "progress", size: "sm" })),
  `<hr class="row-sep">`,
  row("open · groups", `<div class="stack gap-2"><span class="group-title">Option descriptions, group labels, selected check, disabled option</span>${staticPop(staticList(staticUnitOptions("apartment", "house"), "Unit type"))}</div>`),
  row("open · status", `<div style="max-width:220px">${staticPop(staticList(staticStatusOptions(), "Status"))}</div>`),
].join("");

SEC.combo = (t) => [
  row("default", comboField({ source: "users", label: "Assignee", placeholder: "Unassigned", hint: "Responsible for the task. Type to search — results load as you type.", async: true })),
  row("filled", comboField({ source: "users", label: "Assignee", value: "manager.a", hint: "Responsible for the task." })),
  row("hover", comboField({ source: "users", label: "Assignee", value: "manager.b", demo: "hover" })),
  row("focus", comboField({ source: "users", label: "Assignee", value: "admin", demo: "focus" })),
  row("disabled", comboField({ source: "users", label: "Assignee", value: "admin", disabled: true, hint: "Only admins can reassign completed tasks." })),
  row("invalid", comboField({ source: "users", label: "Assignee", req: true, error: "Pick an assignee to launch.", attrs: 'data-validate="required" data-msg="Pick an assignee to launch."' })),
  row("loading", comboField({ source: "users", label: "Assignee", loading: true, hint: "Loading workspace members…" })),
  `<hr class="row-sep">`,
  `<div class="pw-cols pw-cols--static">
    <div class="stack gap-2"><span class="group-title">Typing “manager.” · matches</span>${staticPop(staticList(staticUsers([U("manager.a"), U("manager.b")], { q: "manager.", active: "manager.a" }), "Matches"))}</div>
    <div class="stack gap-2"><span class="group-title">Selected + highlighted</span>${staticPop(staticList(staticUsers([U(""), U("manager.a"), U("manager.b"), U("admin")], { selected: "admin", active: "manager.b" }), "Assignees"))}</div>
    <div class="stack gap-2"><span class="group-title">Typing “zz” · empty</span>${staticPop(`<div class="pw-lb__aux">${emptyBlock(...COMBO_SRC.users.empty)}</div>`)}</div>
    <div class="stack gap-2"><span class="group-title">Searching · loading</span>${staticPop(`<div class="pw-lb__aux">${skeletonRows(3)}</div>`)}</div>
  </div>`,
].join("");

SEC.multi = (t) => [
  row("empty", comboField({ source: "tags", multi: true, label: "Tags", placeholder: "Add a tag", hint: "Tags help managers find the right template." })),
  row("chips", comboField({ source: "tags", multi: true, label: "Tags", value: "move-in,move-out,deposit,keys,inspection,cleaning,meters", hint: "Backspace removes the last tag." })),
  row("compact +N", comboField({ source: "tags", multi: true, compact: true, label: "Tags (compact)", value: "move-in,move-out,deposit,keys,inspection,cleaning,meters", hint: "One line, overflow collapses into a +N chip." })),
  row("avatars", comboField({ source: "watchers", multi: true, label: "Watchers", value: "manager.a,admin", opt: true, placeholder: "Add a watcher" })),
  row("focus", comboField({ source: "tags", multi: true, label: "Tags", value: "move-in,keys", demo: "focus" })),
  row("disabled", comboField({ source: "tags", multi: true, label: "Tags", value: "move-in,keys", disabled: true })),
  row("invalid", comboField({ source: "tags", multi: true, label: "Tags", req: true, error: "Select at least one tag.", attrs: 'data-validate="required" data-msg="Select at least one tag."' })),
  `<hr class="row-sep">`,
  `<div class="pw-cols">
    <div class="stack gap-2"><span class="group-title">Open · tags, multiple selected</span>${staticPop(staticList(["move-in", "move-out", "deposit", "keys", "inspection"].map((id, i) => tagOption(TAGS.find((x) => x.id === id), { selected: ["move-in", "deposit", "keys"].includes(id), i, id: uid("so"), active: id === "deposit" })).join(""), "Tags"))}</div>
    <div class="stack gap-2"><span class="group-title">Open · filtered by “in”</span>${staticPop(staticList(["move-in", "move-out", "inspection"].map((id, i) => tagOption(TAGS.find((x) => x.id === id), { q: "in", selected: id === "move-in", i, id: uid("so"), active: id === "move-out" })).join(""), "Tags"))}</div>
  </div>`,
].join("");

SEC.datetime = (t) => [
  row("due date", dateField({ label: "Due date", req: true, value: "2026-10-24", presets: true, min: true, hint: "Tasks are due at 18:00 Kyiv time unless you set a time." })),
  row("empty", dateField({ label: "Due date", presets: true, min: true, opt: true })),
  row("hover", dateField({ label: "Due date", demo: "hover", value: "2026-10-30", tz: false })),
  row("focus", dateField({ label: "Due date", demo: "focus", value: "2026-10-30", tz: false })),
  row("invalid", dateField({ label: "Due date", req: true, value: "2026-10-20", min: true, error: "Due date can’t be in the past.", presets: true })),
  row("disabled", dateField({ label: "Due date", value: "2026-10-30", disabled: true, tz: false })),
  `<hr class="row-sep">`,
  row("time", timeField({ label: "Due time", value: "09:30", hint: "24-hour clock. Arrow keys change by 1, PgUp / PgDn by 10." })),
  row("time · invalid", timeField({ label: "Due time", value: "23:45", error: "Pick a time between 08:00 and 20:00." })),
  row("time · disabled", timeField({ label: "Due time", value: "09:30", disabled: true })),
  `<hr class="row-sep">`,
  row("range", rangeField({ label: "Move-in window", start: "2026-10-26", end: "2026-10-30", hint: "Both dates are in Kyiv time. DST ends on 25 Oct." })),
  row("range · invalid", rangeField({ label: "Move-in window", start: "2026-10-30", end: "2026-10-26", error: "End date must be after the start date." })),
].join("");

SEC.cal = (t) => `<div class="stack gap-3">
  <div class="split"><span class="group-title">Single · Mon–Sun, today dotted, past dates optional</span></div>
  ${switchCtl({ label: "Disable past dates", checked: true, attrs: "data-cal-min" })}
  <div class="pw-surface"><div data-cal-host="single"></div></div>
  <span class="group-title">Range · two months, hover previews the span</span>
  <div class="pw-surface"><div data-cal-host="range"></div></div>
</div>`;

SEC.number = (t) => [
  row("currency", numberField({ label: "Deposit", currency: true, value: 1250, min: 0, max: 5000, step: 50, hint: "Hold + or − to speed up. Arrow keys change by €50, PgUp / PgDn by €500." })),
  row("hover step", numberField({ label: "Deposit", currency: true, value: 1250, min: 0, max: 5000, step: 50, demoStep: 1 })),
  row("focus", numberField({ label: "Deposit", currency: true, value: 1250, min: 0, max: 5000, step: 50, demo: "focus" })),
  row("at max", numberField({ label: "Deposit", currency: true, value: 5000, min: 0, max: 5000, step: 50, hint: "Maximum deposit is €5,000.00." })),
  row("at min", numberField({ label: "Late fee", currency: true, value: 0, min: 0, max: 500, step: 5 })),
  row("invalid", numberField({ label: "Deposit", currency: true, value: 6200, min: 0, max: 5000, step: 50, error: "Enter an amount between €0.00 and €5,000.00." })),
  row("disabled", numberField({ label: "Deposit", currency: true, value: 1250, min: 0, max: 5000, step: 50, disabled: true })),
  `<hr class="row-sep">`,
  row("quantity", numberField({ label: "Rooms", split: true, value: 3, min: 1, max: 12, step: 1, hint: "Counts bedrooms and living rooms." })),
  row("quantity · max", numberField({ label: "Rooms", split: true, value: 12, min: 1, max: 12, step: 1 })),
].join("");

const chk3 = (o) => cluster(["Unchecked", "Checked", "Mixed"].map((l, i) => checkbox({ label: l, checked: i === 1, indeterminate: i === 2, ...o })).join(""), 20);
SEC.choice = (t) => [
  `<span class="group-title">Checkbox</span>`,
  row("default", chk3({})),
  row("hover", chk3({ demo: "hover" })),
  row("focus", chk3({ demo: "focus" })),
  row("disabled", chk3({ disabled: true })),
  row("invalid", cluster(checkbox({ label: "I confirmed the keys", invalid: true }), 20)),
  row("task", cluster(checkbox({ label: "Sign the handover form", tone: "done", checked: true }) + checkbox({ label: "Read the meters", tone: "done" }), 20)),
  `<div data-pw="checkgroup" class="pw-card" style="padding:12px 16px;gap:4px">${checkbox({ label: "Move-in checklist", attrs: "data-parent" })}<div style="display:grid;gap:0;padding-left:24px">${["Sign the lease agreement", "Inspect the apartment", "Hand over the keys"].map((l, i) => checkbox({ label: l, checked: i < 2, attrs: "data-child" })).join("")}</div><span class="pw-check__desc num" data-count style="padding-left:24px"></span></div>`,
  `<hr class="row-sep">`,
  `<span class="group-title">Radio group</span>`,
  row("default", radioGroup({ legend: "Handover method", name: uid("rg"), value: "person", options: [{ value: "person", label: "In person", desc: "Meet the tenant at the unit." }, { value: "lockbox", label: "Key box", desc: "Leave keys in the lockbox." }, { value: "desk", label: "Concierge", desc: "Not available for this building.", disabled: true }] })),
  row("states", cluster(radioGroup({ aria: "Hover", name: uid("rg"), dir: "row", value: "a", options: [{ value: "a", label: "Hover", demo: "hover" }, { value: "b", label: "Focus", demo: "focus" }] }) + radioGroup({ aria: "Disabled", name: uid("rg"), dir: "row", value: "a", disabled: true, options: [{ value: "a", label: "Disabled" }, { value: "b", label: "Off" }] }), 20)),
  `<hr class="row-sep">`,
  `<span class="group-title">Switch</span>`,
  row("default", cluster(switchCtl({ label: "Off" }) + switchCtl({ label: "On", checked: true }), 24)),
  row("hover", cluster(switchCtl({ label: "Off", demo: "hover" }) + switchCtl({ label: "On", checked: true, demo: "hover" }), 24)),
  row("focus", cluster(switchCtl({ label: "Off", demo: "focus" }) + switchCtl({ label: "On", checked: true, demo: "focus" }), 24)),
  row("disabled", cluster(switchCtl({ label: "Off", disabled: true }) + switchCtl({ label: "On", checked: true, disabled: true }), 24)),
  row("saving", cluster(switchCtl({ label: "Saving…", checked: true, busy: true }) + switchCtl({ label: "Tap to save", async: true, attrs: "" }), 24)),
  row("with text", switchCtl({ label: "Email reminders", desc: "Send a reminder 24 hours before a task is due.", checked: true, lead: true, async: true })),
].join("");

SEC.seg = (t) => [
  `<span class="group-title">Segmented control</span>`,
  row("md", segmented({ label: "View", value: "list", options: [{ value: "list", label: "List", icon: "list" }, { value: "schema", label: "Schema", icon: "schema" }, { value: "canvas", label: "Canvas", icon: "canvas" }] })),
  row("sm", segmented({ label: "View", size: "sm", value: "schema", options: [{ value: "list", label: "List" }, { value: "schema", label: "Schema" }, { value: "canvas", label: "Canvas" }] })),
  row("block", segmented({ label: "Visibility", block: true, value: "all", options: [{ value: "all", label: "All" }, { value: "mine", label: "Assigned to me" }, { value: "overdue", label: "Overdue" }] })),
  row("hover", segmented({ label: "Hover", value: "list", options: [{ value: "list", label: "List" }, { value: "schema", label: "Schema", demo: "hover" }] })),
  row("disabled", segmented({ label: "View", disabled: true, value: "list", options: [{ value: "list", label: "List" }, { value: "schema", label: "Schema" }, { value: "canvas", label: "Canvas" }] })),
  `<hr class="row-sep">`,
  `<span class="group-title">Slider</span>`,
  row("single", sliderField({ label: "Minimum AI confidence", min: 0, max: 100, step: 1, value: 80, fmt: "percent", tone: "ai" })),
  row("range", sliderField({ label: "Budget", min: 0, max: 5000, step: 50, range: [500, 2500], fmt: "euro", labels: ["Minimum budget", "Maximum budget"] })),
  row("bubble", sliderField({ label: "Rooms to inspect", min: 1, max: 12, step: 1, value: 4, fmt: "num", bubble: true })),
  row("hover · focus", sliderField({ label: "Hover", min: 0, max: 100, step: 5, value: 35, fmt: "num", demoThumb: "hover" }) + `<div style="height:8px"></div>` + sliderField({ label: "Focus", min: 0, max: 100, step: 5, value: 65, fmt: "num", demoThumb: "focus" })),
  row("disabled", sliderField({ label: "Minimum AI confidence", min: 0, max: 100, value: 60, fmt: "percent", disabled: true })),
].join("");

SEC.upload = (t) => {
  const sampleBtns = `<div class="pw-presets" style="padding-top:0;margin-top:10px"><span class="pw-field__opt" style="align-self:center">Try:</span><button type="button" class="pw-preset" data-sample="lease">lease-agreement.pdf</button><button type="button" class="pw-preset" data-sample="scan">key-handover.png</button><button type="button" class="pw-preset" data-sample="big">34 MB report</button></div>`;
  return [
    row("default", dropField({ label: "Lease agreement", req: true, hint: "Attach the signed PDF. You can add more than one file." }).replace('</div>\n</div>', '</div>' + sampleBtns + '\n</div>')),
    row("drag over", dropField({ label: "Lease agreement", state: "dragover" })),
    row("files", dropField({ label: "Documents", files: [
      { name: "lease-agreement.pdf", bytes: 2516582, state: "uploading", progress: 0.62 },
      { name: "inspection-report.pdf", bytes: 1887436, state: "done", progress: 1 },
      { name: "key-handover.png", bytes: 3251000, state: "error", error: "Only PDF files are accepted. PDF up to 20 MB." },
      { name: "furniture-list.pdf", bytes: 36700160, state: "error", error: "File is too large (35.0 MB). PDF up to 20 MB." } ] })),
    row("invalid", dropField({ label: "Lease agreement", req: true, invalid: true, error: "Attach the signed lease before launching." })),
    row("disabled", dropField({ label: "Lease agreement", disabled: true, hint: "Uploads are closed for completed runs." })),
  ].join("");
};

SEC.groups = (t) => [
  `<fieldset class="pw-fieldset"><legend>Tenant</legend><p class="pw-fieldset__desc">Used for the welcome email and the handover form.</p>
    <div class="pw-cols">
      ${textField({ label: "Tenant email", req: true, placeholder: "tenant@example.test", attrs: 'data-validate="email"', inputAttrs: 'type="email" autocomplete="off"' })}
      ${dateField({ label: "Move-in date", req: true, value: "2026-10-30", min: true, tz: false })}
    </div>
    ${textareaField({ label: "Notes", opt: true, placeholder: "Parking, pets, access…", hint: "Optional. Visible to everyone on the run." })}
  </fieldset>`,
  `<hr class="row-sep">`,
  `<fieldset class="pw-fieldset"><legend>Handover</legend>
    ${radioGroup({ aria: "Handover method", name: uid("rg"), value: "person", options: [{ value: "person", label: "In person" }, { value: "lockbox", label: "Key box" }] })}
    <div class="pw-cols">
      ${numberField({ label: "Deposit", currency: true, value: 1250, min: 0, max: 5000, step: 50 })}
      ${numberField({ label: "Keys", split: true, value: 2, min: 1, max: 6 })}
    </div>
    ${switchCtl({ label: "Send welcome email", desc: "Goes out when the run is launched.", checked: true, lead: true })}
  </fieldset>`,
].join("");

SEC.launch = (t) => launchForm();

function anatomy() {
  const id = uid();
  return `<div class="theme-panel pw-anatomy">
    <div class="pw-anatomy__fig" style="max-width:360px">
      ${textField({ id, label: "Case name", req: true, value: "Apartment 12, move-in", clear: true, counter: 100, hint: "Shown on the run card and in notifications.", attrs: 'data-max="100"' })}
      <span class="pw-pin" data-side="l" style="left:-30px;top:1px">1</span>
      <span class="pw-pin" data-side="l" style="left:-30px;top:30px">2</span>
      <span class="pw-pin" data-side="l" style="left:-30px;top:72px">3</span>
      <span class="pw-pin" data-side="r" style="right:-26px;top:72px">4</span>
    </div>
    <ol class="pw-legend">
      <li><span class="n">1</span><div><b>Label above</b><span>Always visible, 13/18 medium. Required fields get a red asterisk; optional ones say “Optional” — never both.</span></div></li>
      <li><span class="n">2</span><div><b>Control, 32 px</b><span>Hairline border, 6 px radius. Hover darkens the border; focus is a 2 px ring that replaces it.</span></div></li>
      <li><span class="n">3</span><div><b>Hint → error</b><span>Share one slot, so swapping never moves the page. Errors name the problem and the fix.</span></div></li>
      <li><span class="n">4</span><div><b>Counter</b><span>Tabular numerals; amber at 90%, red over the limit.</span></div></li>
    </ol>
  </div>`;
}

function renderGallery() {
  const set = (k, html) => { const el = $(`[data-render="${k}"]`); if (el) el.innerHTML = html; };
  ["text", "password", "select", "combo", "multi", "datetime", "cal", "number", "choice", "seg", "upload", "groups", "launch"].forEach((k) => set(k, duo(SEC[k])));
  set("anatomy", anatomy());
  set("timing", timingDemo());
}

/* Page chrome: theme + motion toggles, scroll spy, top bar */
function initChrome() {
  const themeSeg = $('[data-seg="theme"]'), motionSeg = $('[data-seg="motion"]');
  const sync = (seg, v) => { $$('[role="radio"]', seg).forEach((b) => { const on = b.dataset.value === v; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; }); seg._place && seg._place(false); };
  sync(themeSeg, root.dataset.theme || "system"); sync(motionSeg, root.dataset.motion || "system");
  themeSeg.addEventListener("pw:change", (e) => {
    const v = e.detail.value;
    const apply = () => { v === "system" ? delete root.dataset.theme : (root.dataset.theme = v); };
    store.set("pw-theme", v === "system" ? null : v);
    if (document.startViewTransition && motionOK()) document.startViewTransition(apply); else apply();
  });
  motionSeg.addEventListener("pw:change", (e) => {
    const v = e.detail.value; v === "system" ? delete root.dataset.motion : (root.dataset.motion = v); store.set("pw-motion", v === "system" ? null : v);
  });
  const links = $$(".nav a");
  const spy = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) links.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + en.target.id)));
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$(".sec").forEach((s) => spy.observe(s));
  const topbar = $("#topbar");
  addEventListener("scroll", () => topbar.classList.toggle("scrolled", scrollY > 4), { passive: true });
}

function initInlineCalendars() {
  $$('[data-cal-host="single"]').forEach((h) => {
    const panelEl = h.closest(".stack"), sw = $("[data-cal-min]", panelEl);
    const cal = Calendar(h, { mode: "single", min: TODAY, value: addDays(TODAY, 3), onSelect() {} });
    sw.addEventListener("change", () => cal.setMin(sw.checked ? TODAY : null));
  });
  $$('[data-cal-host="range"]').forEach((h) => {
    Calendar(h, { mode: "range", months: innerWidth < 640 ? 1 : 2, min: null, start: addDays(TODAY, 3), end: addDays(TODAY, 7), onSelect() {} });
  });
}
function placeStaticHl() {
  $$(".pw-pop[data-static]").forEach((p) => { const hl = $(".pw-lb__hl", p), a = $("[data-active]", p); if (a) moveHl(hl, a, true); });
}

function boot() {
  renderGallery();
  initAll(document);
  initFlags(document);
  $$('[data-pw="switch"]').forEach(() => {});
  initInlineCalendars();
  initChrome();
  placeStaticHl();
  if (document.fonts) document.fonts.ready.then(() => { placeStaticHl(); $$(".pw-seg").forEach((s) => s._place && s._place(false)); });
  addEventListener("resize", () => { placeStaticHl(); });
}
boot();
window.__pw = { Pop, Calendar, TODAY };
})();
