/* ==========================================================================
   Property Workflows — domain components demo  ·  v0.1
   Pure DOM, no dependencies. Builders return HTML strings; behaviours are
   attached by small factories (checklist, runs table, AI draft, invoice,
   sidebar, variable editor, run page).
   ========================================================================== */
(() => {
  "use strict";

  /* ---------------------------------------------------------------- utils */
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  };
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  const motionOK = () => root.dataset.motion === "full" || (root.dataset.motion !== "reduce" && !reduceMQ.matches);
  const tok = (name) => getComputedStyle(root).getPropertyValue("--" + name).trim();
  const tokMs = (name) => { const v = tok(name); return v.endsWith("ms") ? parseFloat(v) : v.endsWith("s") ? parseFloat(v) * 1000 : parseFloat(v) || 0; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const raf2 = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const liveEl = $("#live");
  const announce = (msg) => { liveEl.textContent = ""; requestAnimationFrame(() => { liveEl.textContent = msg; }); };
  const ic = (n, cls = "", extra = "") => `<svg class="pw-icon ${cls}" aria-hidden="true" ${extra}><use href="#i-${n}"/></svg>`;
  const ics = (n) => `<svg aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const wait = (ms) => (motionOK() ? sleep(ms) : sleep(Math.min(ms, 40)));
  const euro = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
  const money = (n) => euro.format(n);

  /* ------------------------------------------------------- SVG pieces */
  const CHECK_SVG = `<svg viewBox="0 0 16 16" aria-hidden="true"><circle class="pw-check__ring" cx="8" cy="8" r="7.25"/><path class="pw-check__tick" pathLength="1" d="M4.9 8.4l2.2 2.2 4.1-4.7"/></svg>`;
  const RING_SVG = `<svg viewBox="0 0 16 16" aria-hidden="true"><circle class="pw-ring__track" cx="8" cy="8" r="7"/><circle class="pw-ring__fill" pathLength="100" cx="8" cy="8" r="7"/><circle class="pw-ring__disc" cx="8" cy="8" r="8"/><path class="pw-ring__tick" pathLength="1" d="M4.9 8.4l2.2 2.2 4.1-4.7"/></svg>`;
  const LOCK_SVG = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.75"/><path class="pw-barrier__shackle" d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7"/></svg>`;

  const G = (inner) => `<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
  const GLYPH = {
    todo: G(`<circle cx="5" cy="5" r="3.5"/>`),
    progress: G(`<circle cx="5" cy="5" r="3.5"/>`) + `<path d="M5 1.5a3.5 3.5 0 0 1 0 7z" fill="currentColor"/>`,
    done: G(`<path d="M2.1 5.2l1.9 1.9 3.9-4.3"/>`),
    overdue: G(`<circle cx="5" cy="5" r="3.5"/><path d="M5 3.1v2.2M5 6.9v.01"/>`),
    clock: G(`<circle cx="5" cy="5" r="3.5"/><path d="M5 3.1V5l1.2.8"/>`),
    draft: G(`<circle cx="5" cy="5" r="3.5" stroke-dasharray="1.7 1.5"/>`),
    issued: G(`<circle cx="5" cy="5" r="3.5"/>`) + `<circle cx="5" cy="5" r="1.5" fill="currentColor"/>`,
    spark: `<path d="M5 .8l.95 2.6 2.6.95-2.6.95L5 8.9l-.95-2.6-2.6-.95 2.6-.95z" fill="currentColor"/>`
  };
  const STATUS_GLYPH = { todo: "todo", progress: "progress", completed: "done", done: "done", paid: "done", overdue: "overdue", "due-soon": "clock", draft: "draft", issued: "issued", ai: "spark" };
  const STATUS_LABEL = { todo: "To do", progress: "In progress", completed: "Completed", done: "Done", paid: "Paid", overdue: "Overdue", "due-soon": "Due soon", draft: "Draft", issued: "Issued", ai: "AI draft" };

  /* ------------------------------------------------------- builders */
  const glyph = (k) => `<svg class="pw-badge__glyph" viewBox="0 0 10 10" aria-hidden="true">${GLYPH[STATUS_GLYPH[k]]}</svg>`;
  const badge = (status, o = {}) => `<span class="pw-badge" data-status="${status}"${o.size ? ` data-size="${o.size}"` : ""}>${glyph(status)}<span class="pw-badge__label">${o.label || STATUS_LABEL[status]}</span></span>`;

  const checkBtn = (o = {}) => `<button type="button" class="pw-check" role="checkbox" tabindex="${o.tab ?? -1}" aria-checked="${!!o.checked}" aria-label="${esc(o.label || "Mark as done")}"${o.size ? ` data-size="${o.size}"` : ""}${o.locked ? ' aria-disabled="true"' : ""}${o.invalid ? ' aria-invalid="true"' : ""}${o.attrs ? " " + o.attrs : ""}>${CHECK_SVG}</button>`;

  const ringHTML = (d, t, o = {}) => {
    const pct = t ? Math.round((d / t) * 100) : 0;
    const state = t && d >= t ? ' data-state="done"' : "";
    return `<span class="pw-ring"${o.size ? ` data-size="${o.size}"` : ""}${state}${d === 0 ? " data-zero" : ""} aria-hidden="true"${o.style ? ` style="${o.style}"` : ""}>${RING_SVG.replace('r="7"/><circle class="pw-ring__disc"', `r="7" style="stroke-dashoffset:${100 - pct}"/><circle class="pw-ring__disc"`)}</span>`;
  };
  function setRing(el, d, t, done = d >= t && t > 0) {
    const pct = t ? Math.round((d / t) * 100) : 0;
    $(".pw-ring__fill", el).style.strokeDashoffset = 100 - pct;
    d === 0 ? el.setAttribute("data-zero", "") : el.removeAttribute("data-zero");
    done ? el.setAttribute("data-state", "done") : el.removeAttribute("data-state");
  }

  /* Rolling-digit ticker */
  const reelHTML = (d) => `<span class="pw-ticker__d"><span class="pw-ticker__reel" style="--d:${d}">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<span>${n}</span>`).join("")}</span></span>`;
  const tickerInner = (text) => [...text].map((c) => (/\d/.test(c) ? reelHTML(c) : `<span>${esc(c)}</span>`)).join("");
  const tickerHTML = (text, size = "label", extra = "") => `<span class="pw-ticker" data-size="${size}" data-text="${esc(text)}" aria-hidden="true" ${extra}>${tickerInner(text)}</span>`;
  function tickerSet(el, text) {
    if (el.dataset.text === text) return;
    el.dataset.text = text;
    const kids = [...el.children], chars = [...text];
    const same = kids.length === chars.length && chars.every((c, i) => /\d/.test(c) === kids[i].classList.contains("pw-ticker__d"));
    motionOK() ? el.removeAttribute("data-instant") : el.setAttribute("data-instant", "");
    if (same) {
      chars.forEach((c, i) => { /\d/.test(c) ? kids[i].firstElementChild.style.setProperty("--d", c) : (kids[i].textContent = c); });
    } else {
      el.innerHTML = tickerInner(text);
      if (motionOK()) {
        const reels = $$(".pw-ticker__reel", el), target = reels.map((r) => r.style.getPropertyValue("--d"));
        reels.forEach((r) => r.style.setProperty("--d", 0));
        void el.offsetWidth;
        reels.forEach((r, i) => r.style.setProperty("--d", target[i]));
      }
    }
  }
  const progText = (d, t) => `${d} of ${t} done`;
  const progressHTML = (d, t, o = {}) => `<span class="pw-progress" data-prog>${o.ring === false ? "" : ringHTML(d, t, { size: o.size })}${tickerHTML(progText(d, t), o.tsize || "label")}<span class="sr-only">${progText(d, t)}</span></span>`;
  function setProgress(el, d, t, done) {
    const ring = $(".pw-ring", el); if (ring) setRing(ring, d, t, done);
    tickerSet($(".pw-ticker", el), progText(d, t));
    $(".sr-only", el).textContent = progText(d, t);
  }
  const barHTML = (p, state = "") => `<span class="pw-bar"${state ? ` data-state="${state}"` : ""} aria-hidden="true" style="--p:${p}"><span class="pw-bar__fill"></span></span>`;

  /* Badge morph: colours cross-fade (CSS), label blurs out/in, width animates */
  function setBadge(el, status, label) {
    if (el.dataset.status === status) return;
    const lab = $(".pw-badge__label", el), old = el.getBoundingClientRect().width;
    const doIt = () => {
      el.dataset.status = status;
      $(".pw-badge__glyph", el).innerHTML = GLYPH[STATUS_GLYPH[status]];
      lab.textContent = label || STATUS_LABEL[status];
    };
    if (!motionOK() || !el.animate) { doIt(); return; }
    lab.animate([{ opacity: 1, filter: "blur(0)" }, { opacity: 0, filter: "blur(2px)" }], { duration: tokMs("duration-instant"), easing: tok("ease-exit"), fill: "forwards" }).finished.then(() => {
      doIt();
      const now = el.getBoundingClientRect().width;
      lab.getAnimations().forEach((a) => a.cancel());
      lab.animate([{ opacity: 0, filter: "blur(2px)" }, { opacity: 1, filter: "blur(0)" }], { duration: tokMs("duration-base"), easing: tok("ease-standard") });
      if (Math.abs(now - old) > 1) el.animate([{ width: old + "px" }, { width: now + "px" }], { duration: tokMs("duration-base"), easing: tok("spring-snappy") });
    }).catch(() => doIt());
  }

  /* People */
  const TONES = { alex: 1, sam: 2, manager: 3, admin: 4, tenant: 5, vendor: 2 };
  const avatar = (email, o = {}) => {
    const k = email.split("@")[0], t = o.tone || TONES[k] || (k.charCodeAt(0) % 5) + 1;
    return `<span class="pw-avatar" role="img" aria-label="${email}" title="${email}" data-tone="${t}"${o.size ? ` data-size="${o.size}"` : ""}${o.i != null ? ` style="--i:${o.i}"` : ""}>${email[0].toUpperCase()}</span>`;
  };
  const avatarEmpty = (size) => `<span class="pw-avatar" data-empty role="img" aria-label="Unassigned" title="Unassigned"${size ? ` data-size="${size}"` : ""}>${ics("user")}</span>`;
  const stack = (names, o = {}) => {
    const emails = names.map((n) => (n.includes("@") ? n : n + "@example.test"));
    return `<span class="pw-stack" role="group" aria-label="Assignees: ${emails.join(", ")}${o.more ? ` and ${o.more} more` : ""}"${o.size ? ` data-size="${o.size}"` : ""}>${emails.map((e, i) => avatar(e, { size: o.size, i })).join("")}${o.more ? `<span class="pw-stack__more" aria-hidden="true">+${o.more}</span>` : ""}</span>`;
  };
  const person = (email, sub) => `<span class="pw-person">${avatar(email, { size: "lg" })}<span class="pw-person__text"><span class="pw-person__name">${email}</span>${sub ? `<span class="pw-person__sub">${sub}</span>` : ""}</span></span>`;
  const roleTag = (role) => `<span class="pw-tag pw-role" data-role="${role}">${role}</span>`;

  /* Dates, tags */
  const DUE_ICON = { normal: "calendar", "due-soon": "clock", overdue: "alert" };
  const due = (kind, text, o = {}) => `<span class="pw-due"${kind !== "normal" ? ` data-due="${kind}"` : ""}>${kind !== "normal" ? `<span class="sr-only">${kind === "overdue" ? "Overdue, " : "Due soon, "}</span>` : ""}${ics(DUE_ICON[kind])}<span>${text}</span>${o.hint && kind !== "normal" ? `<span class="pw-due__hint">· ${kind === "overdue" ? "Overdue" : "Due soon"}</span>` : ""}</span>`;
  const reqTag = (kind = "required", invalid = false) => `<span class="pw-tag pw-req"${invalid ? ' data-invalid="true"' : ' data-variant="plain"'} data-kind="${kind}">${kind === "required" ? `<svg class="pw-req__icon" aria-hidden="true"><use href="#i-alert"/></svg>` : ""}${kind}</span>`;
  const condTag = (text) => `<span class="pw-tag" data-variant="dashed" title="This task is only part of runs where the condition is true">${ics("cond")}${text}</span>`;
  const stopTag = () => `<span class="pw-tag" title="Stop task: later tasks stay locked until this one is done">${ics("lock")}Stop task</span>`;

  /* Confidence, provenance */
  const CONF_LABEL = { high: "High", check: "Check", low: "Low" };
  const conf = (level) => `<span class="pw-conf" data-level="${level}" title="Confidence: ${CONF_LABEL[level]}"><span class="pw-conf__bars" aria-hidden="true"><i></i><i></i><i></i></span><span>${CONF_LABEL[level]}</span><span class="sr-only"> confidence</span></span>`;
  const prov = (text) => `<button type="button" class="pw-prov" title="Open source">${ics("file")}${text}</button>`;

  /* Variables */
  const VARS = [
    { key: "tenant_name", label: "Tenant name", value: "Alex Example", group: "Form fields" },
    { key: "tenant_email", label: "Tenant email", value: "alex@example.test", group: "Form fields" },
    { key: "unit", label: "Unit", value: "Apt 12", group: "Form fields" },
    { key: "move_in_date", label: "Move-in date", value: "24 Oct 2026", group: "Form fields" },
    { key: "deposit", label: "Deposit", value: "€1,250.00", group: "Form fields" },
    { key: "meter_reading", label: "Meter reading", value: null, group: "Form fields" },
    { key: "case_name", label: "Case name", value: "Apartment 12, move-in", group: "Run" },
    { key: "run_due", label: "Due date", value: "28 Oct 2026", group: "Run" },
    { key: "run_owner", label: "Run owner", value: "manager@example.test", group: "Run" },
    { key: "template_name", label: "Template name", value: "Tenant move-in", group: "Template" },
    { key: "template_version", label: "Template version", value: "v3", group: "Template" }
  ];
  const V = Object.fromEntries(VARS.map((v) => [v.key, v]));
  const varChip = (key, state = "chip") => {
    const v = V[key], tip = `{{${key}}}${v.value ? "" : " · no value yet"}`;
    if (state === "resolved") return `<span class="pw-var" data-state="resolved" data-var="${key}" title="${tip} · ${v.label}">${esc(v.value)}</span>`;
    if (state === "value") return `<span class="pw-var" data-state="value" data-var="${key}" title="${tip}">${ic("braces", "pw-var__icon", 'data-size="sm"')}<span class="t-muted">${v.label}</span><span class="num">${esc(v.value || "—")}</span></span>`;
    if (state === "unresolved") return `<span class="pw-var" data-state="unresolved" data-var="${key}" title="${tip}">${ic("braces", "pw-var__icon", 'data-size="sm"')}<span>${v.label}</span></span>`;
    return `<span class="pw-var" data-var="${key}" title="${tip}">${ic("braces", "pw-var__icon", 'data-size="sm"')}<span>${v.label}</span></span>`;
  };

  /* Ease/ms helpers for WAAPI from tokens */
  const springMs = (n) => tokMs(`spring-${n}-duration`);

  /* =====================================================================
     Chrome: segmented control, theme, motion, topbar, section nav
     ===================================================================== */
  function initSeg(seg, onChange) {
    const btns = $$('[role="radio"]', seg), thumb = $(".ds-seg__thumb", seg);
    const place = (animate = true) => {
      const on = btns.find((b) => b.getAttribute("aria-checked") === "true");
      if (!on || !on.offsetWidth) return;
      if (!animate) thumb.style.transition = "none";
      thumb.style.width = on.offsetWidth + "px";
      thumb.style.transform = `translateX(${on.offsetLeft}px)`;
      if (!animate) { void thumb.offsetWidth; thumb.style.transition = ""; }
    };
    const set = (v, o = {}) => {
      btns.forEach((b) => { const on = b.dataset.value === v; b.setAttribute("aria-checked", on); b.tabIndex = on ? 0 : -1; });
      place(!o.instant);
      if (!o.silent && onChange) onChange(v);
    };
    seg.addEventListener("click", (e) => { const b = e.target.closest('[role="radio"]'); if (b && b.getAttribute("aria-checked") !== "true") set(b.dataset.value); });
    seg.addEventListener("keydown", (e) => {
      const i = btns.indexOf(document.activeElement); if (i < 0) return;
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
      e.preventDefault(); const n = btns[(i + d + btns.length) % btns.length]; set(n.dataset.value); n.focus();
    });
    new ResizeObserver(() => place(false)).observe(seg);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => place(false));
    const init = btns.find((b) => b.getAttribute("aria-checked") === "true");
    btns.forEach((b) => (b.tabIndex = b === init ? 0 : -1));
    requestAnimationFrame(() => place(false));
    return { set, place };
  }

  const themeSeg = initSeg($('[data-seg="theme"]'), (v) => {
    const apply = () => { v === "system" ? delete root.dataset.theme : (root.dataset.theme = v); };
    store.set("pw-theme", v === "system" ? null : v);
    document.startViewTransition && motionOK() ? document.startViewTransition(apply) : apply();
  });
  const motionSeg = initSeg($('[data-seg="motion"]'), (v) => {
    v === "system" ? delete root.dataset.motion : (root.dataset.motion = v);
    store.set("pw-motion", v === "system" ? null : v);
  });
  themeSeg.set(root.dataset.theme || "system", { silent: true, instant: true });
  motionSeg.set(root.dataset.motion || "system", { silent: true, instant: true });

  const topbar = $("#topbar");
  const onScroll = () => { scrollY > 4 ? topbar.setAttribute("data-scrolled", "") : topbar.removeAttribute("data-scrolled"); };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  const navLinks = $$(".ds-nav a[href^='#']");
  const secs = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  const spy = () => {
    let cur = secs[0];
    for (const s of secs) if (s.getBoundingClientRect().top <= 120) cur = s;
    navLinks.forEach((a) => (a.getAttribute("href") === "#" + cur.id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
  };
  addEventListener("scroll", spy, { passive: true }); spy();

  /* mark last grid row (no bottom hairline) */
  const markGrids = (scope = document) => $$(".ds-grid", scope).forEach((g) => {
    const n = (parseInt(g.style.getPropertyValue("--cols")) || 3) + 1;
    [...g.children].forEach((c, i, a) => (i >= a.length - n ? c.setAttribute("data-last", "") : c.removeAttribute("data-last")));
  });

  /* =====================================================================
     Checklist rows — one builder, used by the live list and static states
     ===================================================================== */
  const NEXT_TAG = `<span class="pw-row__next">Next</span>`;
  function rowHTML(t, o = {}) {
    const meta = [];
    if (t.stop) meta.push(stopTag());
    if (t.cond) meta.push(condTag(t.cond));
    meta.push(t.req ? reqTag("required") : reqTag("optional"));
    if (t.due) meta.push(due(t.due.kind, t.due.text));
    meta.push(t.assignee ? avatar(t.assignee) : "");
    const lockTip = o.lockTip || "Locked until the stop task is done";
    const attrs = [
      o.id ? `id="${o.id}"` : "", `data-id="${t.id}"`, `data-status="${t.done ? "done" : "todo"}"`,
      `aria-selected="${!!o.selected}"`, o.next ? "data-next" : "", o.locked ? "data-locked" : "",
      o.staticSel ? "data-static-selected" : "", o.force ? "data-force-hover" : ""
    ].filter(Boolean).join(" ");
    return `<div class="pw-row" role="row" ${attrs}>
      <span class="pw-row__lead" role="gridcell">${checkBtn({ checked: t.done, locked: o.locked, label: `${t.done ? "Reopen" : "Mark as done"}: ${t.title}`, attrs: o.force && /hover/.test(o.force) ? "data-force-hover" : "" })}<span class="pw-row__index num">${t.n ?? ""}</span></span>
      <span class="pw-row__title" role="gridcell">${esc(t.title)}<span class="sr-only" data-sr>${t.done ? ", done" : ""}${o.locked ? ", locked" : ""}</span></span>
      <span class="pw-row__meta" role="gridcell">${NEXT_TAG}${meta.join("")}<svg class="pw-row__lock" aria-hidden="true" data-lock ${o.locked ? "" : "hidden"}><title>${lockTip}</title><use href="#i-lock"/></svg></span>
      <span class="pw-row__actions" role="gridcell">
        <button type="button" class="pw-iconbtn" tabindex="-1" data-act="assign" aria-label="Assign" title="Assign">${ics("user")}</button>
        <button type="button" class="pw-iconbtn" tabindex="-1" data-act="due" aria-label="Set due date" title="Due date">${ics("calendar")}</button>
        <button type="button" class="pw-iconbtn" tabindex="-1" data-act="more" aria-label="More actions" title="More">${ics("more")}</button>
      </span>
    </div>`;
  }
  const barrierHTML = (text, open = false) => `<div class="pw-barrier" role="row" data-state="${open ? "open" : "closed"}"><span class="pw-barrier__pill" role="gridcell">${LOCK_SVG}<span>${text}</span></span></div>`;

  function createChecklist(mount, cfg) {
    const uid = cfg.id;
    const sections = cfg.sections.map((s, si) => ({ ...s, tasks: s.tasks.map((t) => ({ ...t })), open: true, si }));
    const initial = JSON.stringify(cfg.sections.map((s) => s.tasks.map((t) => t.done)));
    const tasks = sections.flatMap((s) => s.tasks.map((t) => Object.assign(t, { sec: s })));
    tasks.forEach((t, i) => (t.n = i + 1));
    const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
    let selected = null, invalidSet = new Set();

    mount.innerHTML = `<div class="pw-checklist" role="grid" aria-label="${esc(cfg.label)}" aria-rowcount="${tasks.length}" tabindex="0">
      <div class="pw-checklist__cursor" aria-hidden="true"></div>
      ${sections.map((s) => `<div class="pw-section" role="rowgroup" data-sec="${s.si}">
        <div class="pw-section__headrow" role="row"><div role="gridcell"><button type="button" class="pw-section__head" aria-expanded="true"><svg class="pw-section__chev" aria-hidden="true"><use href="#i-chev"/></svg><span class="pw-section__name">${esc(s.name)}</span><span class="pw-section__count num" data-count></span></button></div></div>
        <div class="pw-section__rows">${s.tasks.map((t) => rowHTML(t, { id: `${uid}-${t.id}` }) + (t.stop ? barrierHTML(cfg.barrierText(t)) : "")).join("")}</div>
      </div>`).join("")}
    </div>`;
    const list = $(".pw-checklist", mount), cursor = $(".pw-checklist__cursor", list);
    const rowEl = (id) => $(`.pw-row[data-id="${id}"]`, list);
    const visibleRows = () => $$(".pw-row", list).filter((r) => !r.closest("[hidden]"));
    const lockedBy = (t) => tasks.slice(0, tasks.indexOf(t)).find((x) => x.stop && !x.done);
    const requiredLeft = () => tasks.filter((t) => t.req && !t.done);
    const nextReq = () => tasks.find((t) => t.req && !t.done && !lockedBy(t));
    const counts = () => ({ done: tasks.filter((t) => t.done).length, total: tasks.length, requiredLeft: requiredLeft().length, complete: requiredLeft().length === 0 });

    function placeCursor(instant) {
      const r = selected && rowEl(selected.id);
      if (!r || r.closest("[hidden]")) { cursor.removeAttribute("data-on"); return; }
      if (instant || !cursor.hasAttribute("data-on")) cursor.style.transition = "none";
      cursor.style.height = r.offsetHeight + "px";
      cursor.style.setProperty("--y", r.offsetTop + "px");
      cursor.setAttribute("data-on", "");
      if (instant || cursor.style.transition === "none") { void cursor.offsetWidth; cursor.style.transition = ""; }
    }
    function select(id, o = {}) {
      const t = byId[id]; if (!t) return;
      selected = t;
      $$(".pw-row", list).forEach((r) => r.setAttribute("aria-selected", r.dataset.id === id));
      list.setAttribute("aria-activedescendant", `${uid}-${id}`);
      placeCursor(o.instant);
      if (o.scroll) rowEl(id).scrollIntoView({ block: "nearest" });
      if (cfg.onSelect && !o.silent) cfg.onSelect(t);
    }
    function refresh(o = {}) {
      const nxt = nextReq();
      tasks.forEach((t) => {
        const r = rowEl(t.id), lk = lockedBy(t), chk = $(".pw-check", r);
        r.dataset.status = t.done ? "done" : "todo";
        chk.setAttribute("aria-checked", t.done);
        chk.setAttribute("aria-label", `${t.done ? "Reopen" : "Mark as done"}: ${t.title}`);
        lk && !t.done ? (r.setAttribute("data-locked", ""), chk.setAttribute("aria-disabled", "true")) : (r.removeAttribute("data-locked"), chk.removeAttribute("aria-disabled"));
        $("[data-lock]", r).hidden = !(lk && !t.done);
        if (lk) $("[data-lock] title", r).textContent = `Locked until “${lk.title}” is done`;
        nxt === t ? r.setAttribute("data-next", "") : r.removeAttribute("data-next");
        $("[data-sr]", r).textContent = (t.done ? ", done" : "") + (lk && !t.done ? ", locked" : "") + (nxt === t ? ", next required" : "");
        const rt = $(".pw-req[data-kind='required']", r);
        if (rt) { const bad = invalidSet.has(t.id) && !t.done; bad ? (rt.removeAttribute("data-variant"), rt.setAttribute("data-invalid", "true")) : (rt.removeAttribute("data-invalid"), rt.setAttribute("data-variant", "plain")); bad ? chk.setAttribute("aria-invalid", "true") : chk.removeAttribute("aria-invalid"); }
      });
      $$(".pw-barrier", list).forEach((b, i) => { const stopT = tasks.filter((t) => t.stop)[i]; b.dataset.state = stopT.done ? "open" : "closed"; });
      sections.forEach((s) => ($(`[data-sec="${s.si}"] [data-count]`, list).textContent = `${s.tasks.filter((t) => t.done).length}/${s.tasks.length}`));
      if (!o.silent && cfg.onChange) cfg.onChange(counts(), api);
    }
    function lockedFeedback(t) {
      const lk = lockedBy(t), b = $$(".pw-barrier", list)[tasks.filter((x) => x.stop).indexOf(lk)];
      if (b && motionOK()) $(".pw-barrier__pill", b).animate([{ transform: "translateX(0)" }, { transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "translateX(-2px)" }, { transform: "translateX(0)" }], { duration: tokMs("duration-moderate"), easing: tok("ease-standard") });
      cfg.say(`<svg aria-hidden="true"><use href="#i-lock"/></svg>“${esc(t.title)}” is locked until “${esc(lk.title)}” is done.`);
    }
    function toggle(id, o = {}) {
      const t = byId[id], r = rowEl(id), chk = $(".pw-check", r);
      if (!t) return;
      if (lockedBy(t) && !t.done) { lockedFeedback(t); return; }
      if (t.done && t.stop && tasks.slice(tasks.indexOf(t) + 1).some((x) => x.done)) { cfg.say(`<svg aria-hidden="true"><use href="#i-lock"/></svg>Reopen the later tasks before reopening “${esc(t.title)}”.`); return; }
      const lastReq = !t.done && t.req && requiredLeft().length === 1;
      t.done = !t.done;
      invalidSet.delete(id);
      if (motionOK()) {
        chk.removeAttribute("data-pop"); chk.removeAttribute("data-glow"); void chk.offsetWidth;
        if (t.done) chk.setAttribute(lastReq ? "data-glow" : "data-pop", "");
      }
      const wasStop = t.stop;
      refresh();
      cfg.say(t.done ? `<svg aria-hidden="true"><use href="#i-check"/></svg>“${esc(t.title)}” done.${wasStop ? " The tasks below are unlocked." : ""}`  : `“${esc(t.title)}” reopened.`, t.done ? "done" : "neutral");
      announce(`${t.title} ${t.done ? "done" : "reopened"}. ${counts().done} of ${counts().total} done.`);
      if (!o.keepSel) select(id, { silent: true });
    }
    function tryComplete() {
      const left = requiredLeft();
      invalidSet = new Set(left.map((t) => t.id));
      refresh({ silent: true });
      if (left.length) {
        select(left[0].id, { scroll: true });
        cfg.say(`<svg aria-hidden="true"><use href="#i-alert"/></svg>${left.length} required ${left.length === 1 ? "task is" : "tasks are"} not done: ${left.map((t) => "“" + esc(t.title) + "”").join(", ")}.`);
        announce(`${left.length} required tasks are not done.`);
        if (motionOK()) left.forEach((t) => $(".pw-req", rowEl(t.id)).animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: tokMs("duration-moderate"), easing: tok("spring-bouncy") }));
      } else {
        cfg.say(`<svg aria-hidden="true"><use href="#i-check"/></svg>All required tasks are done. The run can be completed.`, "done");
      }
      if (cfg.onChange) cfg.onChange(counts(), api);
    }
    function reset() {
      const init = JSON.parse(initial);
      sections.forEach((s, si) => s.tasks.forEach((t, ti) => (t.done = init[si][ti])));
      invalidSet = new Set();
      refresh();
      cfg.say("");
      select(nextReq() ? nextReq().id : tasks[0].id, { silent: true });
    }

    list.addEventListener("click", (e) => {
      const chk = e.target.closest(".pw-check"), row = e.target.closest(".pw-row"), head = e.target.closest(".pw-section__head"), act = e.target.closest("[data-act]");
      if (head) {
        const s = sections[+head.closest(".pw-section").dataset.sec], open = head.getAttribute("aria-expanded") !== "true";
        head.setAttribute("aria-expanded", open); const rows = $(".pw-section__rows", head.closest(".pw-section")); rows.hidden = !open;
        if (open && motionOK()) rows.animate([{ opacity: 0, transform: `translateY(calc(${tok("distance-2")} * -1))` }, { opacity: 1, transform: "none" }], { duration: tokMs("duration-base"), easing: tok("ease-standard") });
        if (selected && rowEl(selected.id).closest("[hidden]")) { const v = visibleRows(); if (v[0]) select(v[0].dataset.id, { silent: true }); }
        placeCursor(true); return;
      }
      if (act) { if (row) select(row.dataset.id, { silent: true }); announce(`${act.getAttribute("aria-label")} opens here.`); return; }
      if (!row) return;
      if (chk) { toggle(row.dataset.id); return; }
      select(row.dataset.id);
      list.focus({ preventScroll: true });
    });
    list.addEventListener("keydown", (e) => {
      if (e.target !== list || e.metaKey || e.ctrlKey || e.altKey) return;
      const rows = visibleRows(), i = Math.max(0, rows.findIndex((r) => selected && r.dataset.id === selected.id));
      const go = (n) => { const r = rows[Math.min(rows.length - 1, Math.max(0, n))]; if (r) select(r.dataset.id, { scroll: true }); };
      const k = e.key.toLowerCase();
      if (k === "j" || e.key === "ArrowDown") { e.preventDefault(); go(i + 1); }
      else if (k === "k" || e.key === "ArrowUp") { e.preventDefault(); go(i - 1); }
      else if (e.key === "Home") { e.preventDefault(); go(0); }
      else if (e.key === "End") { e.preventDefault(); go(rows.length - 1); }
      else if (k === "x" || e.key === " ") { e.preventDefault(); if (selected) toggle(selected.id, { keepSel: true }); }
      else if (e.key === "Enter" && cfg.onOpen) { e.preventDefault(); if (selected) cfg.onOpen(selected); }
    });
    list.addEventListener("focus", () => { if (!selected) { const v = visibleRows(); v[0] && select(v[0].dataset.id, { silent: true }); } });
    new ResizeObserver(() => placeCursor(true)).observe(list);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeCursor(true));

    const api = { el: list, tasks, byId, toggle, select, counts, reset, tryComplete, refresh, get selected() { return selected; }, nextReq, lockedBy };
    refresh({ silent: true });
    const first = cfg.selected || (nextReq() ? nextReq().id : tasks[0].id);
    select(first, { silent: true, instant: true });
    if (cfg.onChange) cfg.onChange(counts(), api);
    requestAnimationFrame(() => placeCursor(true));
    return api;
  }

  /* =====================================================================
     State-grid templates (rendered into light + dark panes)
     ===================================================================== */
  const grid = (cols, head, rows) => `<div class="ds-grid" style="--cols:${cols}">${["", ...head].map((h) => `<div class="ds-grid__h">${h}</div>`).join("")}${rows.map((r) => r.map((c, i) => (i === 0 ? `<div class="ds-grid__k">${c}</div>` : `<div>${c}</div>`)).join("")).join("")}</div>`;
  const sub = (title, text) => `<div class="ds-sub"><h3 class="t-label">${title}</h3><p>${text}</p></div>`;
  const muted = (t) => `<span class="t-meta t-muted">${t}</span>`;

  function tplStatus() {
    const c = (o) => checkBtn({ tab: 0, ...o });
    const task = grid(3, ["16px", "14px", "Meaning"], [
      ["to do", c({}), c({ size: "sm" }), muted("Not started")],
      ["hover", c({ attrs: "data-force-hover" }), c({ size: "sm", attrs: "data-force-hover" }), muted("Pointer over the ring")],
      ["done", c({ checked: true }), c({ size: "sm", checked: true }), muted("Drawn check")],
      ["next", c({ attrs: "data-next" }), c({ size: "sm", attrs: "data-next" }), muted("First open required")],
      ["locked", c({ locked: true }), c({ size: "sm", locked: true }), muted("Behind a stop task")],
      ["invalid", c({ invalid: true }), c({ size: "sm", invalid: true }), muted("Required, not done")],
      ["focus", c({ attrs: "data-force-focus" }), c({ size: "sm", attrs: "data-force-focus" }), muted("Keyboard focus")]
    ]);
    const rings = grid(4, ["14px", "16px", "20px", "Reads as"], [
      ["0 of 5", ringHTML(0, 5, { size: "sm" }), ringHTML(0, 5), ringHTML(0, 5, { size: "lg" }), muted("0 of 5 done")],
      ["2 of 5", ringHTML(2, 5, { size: "sm" }), ringHTML(2, 5), ringHTML(2, 5, { size: "lg" }), muted("2 of 5 done")],
      ["4 of 5", ringHTML(4, 5, { size: "sm" }), ringHTML(4, 5), ringHTML(4, 5, { size: "lg" }), muted("4 of 5 done")],
      ["completed", ringHTML(5, 5, { size: "sm" }), ringHTML(5, 5), ringHTML(5, 5, { size: "lg" }), muted("Completed")]
    ]);
    const badges = grid(2, ["Pill 20px", "Small 18px"], ["todo", "progress", "completed", "overdue", "due-soon", "draft", "issued", "paid", "ai"].map((s) => [s, badge(s), badge(s, { size: "sm" })]));
    const dates = grid(2, ["Date", "Marker"], [
      ["default", due("normal", "28 Oct"), reqTag("required")],
      ["due soon", due("due-soon", "24 Oct"), reqTag("optional")],
      ["overdue", due("overdue", "22 Oct"), reqTag("required", true)]
    ]);
    return sub("Task status control", "Ring → drawn check. Click any of them.") + task + sub("Run status ring", "Fills by N of M, then becomes a check") + rings + sub("Status pills", "Glyph + word + tint") + badges + sub("Due dates and markers", "Only the date is tinted; “required” turns red after a failed attempt") + dates;
  }

  function tplProgress() {
    const rows = [[0, 5, 0], [2, 5, 0.4], [4, 5, 0.8], [5, 5, 1]];
    return sub("Ring, bar and ticker together", "Same value, three expressions") + grid(3, ["Bar 4px", "Ring 20px", "Ticker"], rows.map(([d, t, p]) => [`${d} of ${t}`, barHTML(p, d === t ? "done" : ""), ringHTML(d, t, { size: "lg" }), `<span class="pw-progress">${tickerHTML(progText(d, t))}<span class="sr-only">${progText(d, t)}</span></span>`]))
      + sub("Ticker sizes", "Digits roll; words stay put") + `<div class="ds-tickers"><div>${tickerHTML("2 of 5 done", "label")}</div><div>${tickerHTML("12 of 16 done", "heading")}</div><div>${tickerHTML("€1,250.00", "title")}</div></div>`;
  }

  const demoTasks = {
    meters: { id: "d1", n: 2, title: "Read the meters", req: true, assignee: "sam@example.test", due: { kind: "due-soon", text: "24 Oct" } },
    done: { id: "d2", n: 1, title: "Inspect the apartment", req: true, done: true, assignee: "alex@example.test", due: { kind: "normal", text: "20 Oct" } },
    photo: { id: "d3", n: 3, title: "Photograph the rooms", req: false, assignee: "alex@example.test", due: { kind: "overdue", text: "22 Oct" } },
    cond: { id: "d4", n: 6, title: "Schedule the final cleaning", req: false, cond: "shown if Type = Move-out" },
    stop: { id: "d5", n: 4, title: "Sign the handover form", req: true, stop: true, assignee: "manager@example.test" },
    keys: { id: "d6", n: 5, title: "Hand over the keys", req: true, assignee: "sam@example.test" }
  };
  function tplRows() {
    const cap = (t) => `<div class="ds-states__cap">${t}</div>`;
    const r = (t, o) => `<div class="ds-rowbox">${rowHTML(t, o)}</div>`;
    return `<div class="ds-states">
      ${cap("default")}${r(demoTasks.meters, {})}
      ${cap("hover · actions revealed")}${r(demoTasks.meters, { force: "hover" })}
      ${cap("selected")}${r(demoTasks.meters, { selected: true, staticSel: true })}
      ${cap("next required")}${r(demoTasks.meters, { next: true })}
      ${cap("done")}${r(demoTasks.done, {})}
      ${cap("overdue · optional")}${r(demoTasks.photo, {})}
      ${cap("condition marker")}${r(demoTasks.cond, {})}
      ${cap("stop task · barrier · locked")}${r(demoTasks.stop, {})}${barrierHTML("<b>Stop task</b> · tasks below unlock when this is done")}${r(demoTasks.keys, { locked: true, lockTip: "Locked until “Sign the handover form” is done" })}
    </div>`;
  }

  function tplPeople() {
    const emails = ["alex", "sam", "manager", "admin", "tenant"].map((n) => n + "@example.test");
    const sizes = grid(3, ["16px", "20px", "24px"], [...emails.map((e) => [e.split("@")[0], avatar(e, { size: "sm" }), avatar(e), avatar(e, { size: "lg" })]), ["unassigned", avatarEmpty("sm"), avatarEmpty(), avatarEmpty("lg")]]);
    const others = grid(2, ["Sample", "Notes"], [
      ["stack", stack(["alex", "sam", "vendor"]), muted("−4px overlap")],
      ["stack +3", stack(["alex", "sam", "vendor"], { more: 3 }), muted("Hover spreads it")],
      ["small", stack(["alex", "sam"], { size: "sm", more: 2 }), muted("16px, dense")],
      ["manager", person("manager@example.test", "Property manager"), roleTag("manager")],
      ["admin", person("admin@example.test", "Workspace admin"), roleTag("admin")]
    ]);
    return sub("Avatars", "Initial from the email, tone from the chart palette") + sizes + sub("Stacks, people and roles", "Role is a word, not a colour") + others;
  }

  function tplVars() {
    const sent = (a, b) => `<span class="ds-sentence">Hi ${a}, welcome to ${b}.</span>`;
    return sub("Chip states", "Human label in the UI, raw token in the tooltip") + grid(1, ["In a sentence"], [
      ["template", sent(varChip("tenant_name"), varChip("unit"))],
      ["resolved", sent(varChip("tenant_name", "resolved"), varChip("unit", "resolved"))],
      ["value", `<span class="cluster gap-2">${varChip("unit", "value")}${varChip("deposit", "value")}</span>`],
      ["unresolved", `<span class="ds-sentence">Last reading: ${varChip("meter_reading", "unresolved")}</span>`]
    ]);
  }

  /* AI field builder (full and mini) */
  const aiFieldHTML = (f, o = {}) => `<div class="pw-aifield" role="listitem" tabindex="${o.tab ?? -1}" data-i="${o.i ?? ""}" data-state="${o.state || "draft"}" aria-keyshortcuts="Enter Backspace" aria-label="${esc(`${f.k}: ${f.v}, AI draft from lease.pdf ${f.p}, confidence ${CONF_LABEL[f.c]}`)}"${o.focus ? " data-force-focus" : ""}>
    <span class="pw-aifield__label">${f.k}</span>
    <span class="pw-aifield__value"><i class="pw-ai__sheen" style="--w:${f.w || 60}%"></i><svg class="pw-aifield__spark" aria-hidden="true"><use href="#i-spark"/></svg><span>${esc(f.v)}</span><svg class="pw-aifield__ok" aria-hidden="true"><use href="#i-check"/></svg></span>
    ${prov("lease.pdf · " + f.p)}${conf(f.c)}
    <span class="pw-aifield__status" aria-hidden="true"></span>
    <span class="pw-aifield__actions">
      <button type="button" class="pw-iconbtn" tabindex="-1" data-act="accept" aria-label="Accept ${esc(f.k)}" title="Accept (↵)">${ics("check")}</button>
      <button type="button" class="pw-iconbtn" tabindex="-1" data-act="reject" aria-label="Reject ${esc(f.k)}" title="Reject (⌫)">${ics("x")}</button>
      <button type="button" class="pw-iconbtn" tabindex="-1" data-act="undo" aria-label="Undo" title="Undo" hidden>${ics("undo")}</button>
    </span>
  </div>`;
  const AI_FIELDS = [
    { k: "Tenant name", v: "Alex Example", p: "p. 1", c: "high", w: 52 },
    { k: "Unit", v: "Apt 12", p: "p. 1", c: "high", w: 28 },
    { k: "Move-in date", v: "24 Oct 2026", p: "p. 2", c: "high", w: 40 },
    { k: "Move-out date", v: "23 Oct 2027", p: "p. 2", c: "check", w: 38 },
    { k: "Monthly rent", v: "€980.00", p: "p. 3", c: "high", w: 34 },
    { k: "Deposit", v: "€1,250.00", p: "p. 3", c: "check", w: 36 },
    { k: "Notice period", v: "2 months", p: "p. 5", c: "low", w: 30 }
  ];
  function tplAI() {
    const cap = (t) => `<div class="ds-states__cap">${t}</div>`;
    const f = AI_FIELDS;
    const mk = (i, state, extra = {}) => aiFieldHTML(f[i], { state, tab: 0, i, ...extra });
    return `<div class="pw-ai pw-ai--static"><div class="pw-ai__list ds-states">
      ${cap("parsing")}${mk(0, "loading")}
      ${cap("draft · high")}${mk(1, "draft")}
      ${cap("draft · check")}${mk(5, "draft")}
      ${cap("draft · low")}${mk(6, "draft")}
      ${cap("focused")}${mk(2, "draft", { focus: true })}
      ${cap("accepted")}${mk(4, "accepted")}
      ${cap("rejected")}${mk(3, "rejected")}
    </div></div>`;
  }

  const TPL = { status: tplStatus, progress: tplProgress, rows: tplRows, people: tplPeople, vars: tplVars, ai: tplAI };
  $$("[data-tpl]").forEach((el) => { el.innerHTML = TPL[el.dataset.tpl](); });
  /* static AI states: show the right status words */
  $$(".pw-ai--static .pw-aifield").forEach((f) => { const s = f.dataset.state; $(".pw-aifield__status", f).textContent = s === "accepted" ? "Accepted" : s === "rejected" ? "Rejected" : ""; if (s !== "draft" && s !== "loading") { $("[data-act='accept']", f).hidden = true; $("[data-act='reject']", f).hidden = true; $("[data-act='undo']", f).hidden = false; } });
  markGrids();
  /* delegated: the demo task controls in the status pane are real */
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-tpl='status'] .pw-check"); if (!c || c.getAttribute("aria-disabled") === "true") return;
    const on = c.getAttribute("aria-checked") !== "true"; c.setAttribute("aria-checked", on);
    c.removeAttribute("data-pop"); void c.offsetWidth; if (on && motionOK()) c.setAttribute("data-pop", "");
  });

  /* =====================================================================
     00 · At a glance
     ===================================================================== */
  $$('[data-mount="glance"]').forEach((m) => {
    m.innerHTML = `<div class="ds-glance">
      <div class="ds-glance__run">
        ${ringHTML(2, 5, { size: "lg" })}
        <div class="stack gap-0" style="--gap:0"><span class="t-label t-strong">Apartment 12, move-in</span><span class="t-meta t-muted">Tenant move-in</span></div>
        <span class="grow"></span>${stack(["alex", "sam", "vendor"], { more: 3 })}${badge("progress")}
      </div>
      <div class="ds-glance__prog">${barHTML(0.4)}${progressHTML(2, 5, { ring: false })}</div>
      <div class="ds-glance__rows">
        ${rowHTML({ ...demoTasks.done, n: 1 }, { })}
        ${rowHTML({ ...demoTasks.meters, n: 2 }, { next: true, selected: false })}
        ${rowHTML({ ...demoTasks.keys, n: 3 }, { locked: true })}
      </div>
      <div class="ds-glance__chips">
        ${badge("ai")}${conf("high")}${prov("lease.pdf · p. 2")}${varChip("tenant_name")}${due("overdue", "22 Oct", { hint: true })}
      </div>
    </div>`;
  });

  /* =====================================================================
     02 · Progress playground
     ===================================================================== */
  (() => {
    const names = ["Inspect the apartment", "Read the meters", "Photograph the rooms", "Sign the handover form", "Hand over the keys"];
    const state = names.map((_, i) => i < 2);
    const tasksEl = $("#pg-tasks"), sum = $("#pg-sum");
    tasksEl.innerHTML = names.map((n, i) => `<div class="ds-pgtask" data-i="${i}">${checkBtn({ tab: 0, checked: state[i], label: n })}<span class="ds-pgtask__t">${n}</span></div>`).join("");
    const done = () => state.filter(Boolean).length;
    sum.innerHTML = `<div class="ds-pgdemo__top">
        <span class="ds-pgdemo__ring">${ringHTML(2, 5, { style: "--_s:44px" })}</span>
        <div class="stack gap-1" style="--gap:2px"><span class="ds-pgdemo__num" id="pg-prog">${progressHTML(2, 5, { ring: false, tsize: "title" })}</span><span class="t-meta t-muted">Apartment 12, move-in</span></div>
        <span class="grow"></span><span id="pg-badge">${badge("progress")}</span>
      </div>
      <div class="ds-pgdemo__bar">${barHTML(0.4)}</div>
      <div class="ds-pgdemo__sizes"><span>${ringHTML(2, 5, { size: "sm" })}<i>14</i></span><span>${ringHTML(2, 5)}<i>16</i></span><span>${ringHTML(2, 5, { size: "lg" })}<i>20</i></span><span class="grow"></span><span class="t-meta t-muted" id="pg-note">3 tasks left</span></div>`;
    const rings = $$(".pw-ring", sum), bar = $(".pw-bar", sum), prog = $("#pg-prog .pw-progress"), badgeEl = $("#pg-badge .pw-badge");
    function paint(lastGlow) {
      const d = done(), t = names.length, c = d === t;
      rings.forEach((r) => setRing(r, d, t, c));
      bar.style.setProperty("--p", d / t); c ? bar.setAttribute("data-state", "done") : bar.removeAttribute("data-state");
      tickerSet($(".pw-ticker", prog), progText(d, t)); $(".sr-only", prog).textContent = progText(d, t);
      setBadge(badgeEl, c ? "completed" : "progress");
      $("#pg-note").textContent = c ? "All tasks done" : `${t - d} ${t - d === 1 ? "task" : "tasks"} left`;
      $$(".ds-pgtask", tasksEl).forEach((row, i) => { const ck = $(".pw-check", row); ck.setAttribute("aria-checked", state[i]); });
      if (lastGlow && c && motionOK()) { const big = rings[0]; big.removeAttribute("data-glow"); void big.offsetWidth; big.setAttribute("data-glow", ""); }
      announce(progText(d, t) + (c ? ". Run completed." : ""));
    }
    tasksEl.addEventListener("click", (e) => {
      const row = e.target.closest(".ds-pgtask"); if (!row) return;
      const i = +row.dataset.i, was = state[i]; state[i] = !was;
      const ck = $(".pw-check", row); ck.removeAttribute("data-pop"); void ck.offsetWidth; if (state[i] && motionOK()) ck.setAttribute("data-pop", "");
      paint(state[i] && done() === names.length);
    });
    $("#pg-next").addEventListener("click", () => { const i = state.indexOf(false); if (i < 0) return; state[i] = true; const ck = $(`.ds-pgtask[data-i="${i}"] .pw-check`, tasksEl); ck.removeAttribute("data-pop"); void ck.offsetWidth; motionOK() && ck.setAttribute("data-pop", ""); paint(done() === names.length); });
    $("#pg-reset").addEventListener("click", () => { state.fill(false).fill(true, 0, 2); paint(false); });
    paint(false);
  })();

  /* =====================================================================
     03 · Checklist (interactive)
     ===================================================================== */
  const clMsg = $("#cl-msg");
  const say = (html, tone) => { clMsg.innerHTML = html || "&nbsp;"; tone ? clMsg.setAttribute("data-tone", tone) : clMsg.removeAttribute("data-tone"); };
  const CL_SECTIONS = [
    { name: "Before move-in", tasks: [
      { id: "t1", title: "Inspect the apartment", req: true, done: true, assignee: "alex@example.test", due: { kind: "normal", text: "20 Oct" } },
      { id: "t2", title: "Read the meters", req: true, assignee: "sam@example.test", due: { kind: "due-soon", text: "24 Oct" } },
      { id: "t3", title: "Photograph the rooms", req: false, assignee: "alex@example.test", due: { kind: "overdue", text: "22 Oct" } }
    ] },
    { name: "Move-in day", tasks: [
      { id: "t4", title: "Sign the handover form", req: true, stop: true, assignee: "manager@example.test", due: { kind: "normal", text: "28 Oct" } },
      { id: "t5", title: "Hand over the keys", req: true, assignee: "sam@example.test" },
      { id: "t6", title: "Schedule the final cleaning", req: false, cond: "shown if Type = Move-out" }
    ] }
  ];
  const clHead = $("#cl-head");
  clHead.innerHTML = `<div class="stack gap-0" style="--gap:2px"><span class="t-label t-strong">Apartment 12, move-in</span><span class="t-meta t-muted" id="cl-sub">Tenant move-in</span></div><span class="grow"></span>${progressHTML(1, 6, { size: "lg" })}<span id="cl-badge">${badge("progress")}</span>`;
  const clProg = $(".pw-progress", clHead), clBadge = $("#cl-badge .pw-badge");
  const checklist = createChecklist($("#cl-mount"), {
    id: "cl", label: "Tenant move-in checklist", sections: CL_SECTIONS, say,
    barrierText: (t) => `<b>Stop task</b> · tasks below unlock when “${esc(t.title)}” is done`,
    onChange: (c, api) => {
      setProgress(clProg, c.done, c.total, c.complete);
      setBadge(clBadge, c.complete ? "completed" : "progress");
      const opt = c.total - c.done;
      $("#cl-sub").textContent = c.complete ? `Tenant move-in · all required done${opt ? `, ${opt} optional left` : ""}` : `Tenant move-in · ${c.requiredLeft} required left`;
      if (c.complete && motionOK() && !clProg.dataset.glowed) { clProg.dataset.glowed = "1"; const r = $(".pw-ring", clProg); r.removeAttribute("data-glow"); void r.offsetWidth; r.setAttribute("data-glow", ""); }
      if (!c.complete) delete clProg.dataset.glowed;
    }
  });
  $("#cl-try").addEventListener("click", () => checklist.tryComplete());
  $("#cl-reset").addEventListener("click", () => checklist.reset());

  /* =====================================================================
     04 · Runs table
     ===================================================================== */
  (() => {
    const TODAY = new Date(2026, 9, 23);
    const fmt = (iso) => { const d = new Date(iso); return d.getDate() + " " + d.toLocaleString("en-GB", { month: "short" }); };
    const RUNS = [
      { id: "r1", name: "Apartment 7, move-out", tpl: "Tenant move-out", done: 1, total: 4, next: "Collect the keys", people: ["alex", "sam"], more: 0, due: "2026-10-20" },
      { id: "r2", name: "House 8, inspection", tpl: "Inspection", done: 4, total: 6, next: "Photograph the roof", people: ["sam"], more: 0, due: "2026-10-21" },
      { id: "r3", name: "Apartment 12, move-in", tpl: "Tenant move-in", done: 2, total: 5, next: "Sign the handover form", people: ["alex", "sam", "vendor"], more: 3, due: "2026-10-24" },
      { id: "r4", name: "House 3, inspection", tpl: "Inspection", done: 3, total: 6, next: "Photograph the rooms", people: ["manager", "alex"], more: 0, due: "2026-10-28" },
      { id: "r5", name: "Apartment 15, move-in", tpl: "Tenant move-in", done: 1, total: 5, next: "Read the meters", people: ["sam", "tenant"], more: 1, due: "2026-10-30" },
      { id: "r6", name: "Apartment 9, move-out", tpl: "Tenant move-out", done: 0, total: 4, next: "Inspect the apartment", people: [], more: 0, due: "2026-11-02" },
      { id: "r7", name: "Apartment 4, move-in", tpl: "Tenant move-in", done: 5, total: 5, next: null, people: ["alex"], more: 0, due: "2026-10-19", completed: true },
      { id: "r8", name: "Apartment 2, move-out", tpl: "Tenant move-out", done: 4, total: 4, next: null, people: ["sam", "manager"], more: 0, due: "2026-10-16", completed: true }
    ];
    RUNS.forEach((r) => {
      const days = Math.round((new Date(r.due) - TODAY) / 864e5);
      r.kind = r.completed ? "normal" : days < 0 ? "overdue" : days <= 3 ? "due-soon" : "normal";
      r.rank = r.completed ? 3 : days < 0 ? 0 : days <= 3 ? 1 : 2;
    });
    const tbody = $("#rt-body"), table = $("#rt"), msg = $("#rt-msg"), filterEl = $("#rt-filter");
    let sort = { col: "due", dir: "ascending" }, view = "data", sel = null, focusId = null;
    const cmp = {
      name: (a, b) => a.name.localeCompare(b.name, "en", { numeric: true }),
      progress: (a, b) => a.done / a.total - b.done / b.total,
      due: (a, b) => a.rank - b.rank || new Date(a.due) - new Date(b.due),
      status: (a, b) => Number(!!a.completed) - Number(!!b.completed) || a.rank - b.rank
    };
    const rowHtml = (r) => `<tr role="row" tabindex="-1" data-id="${r.id}" aria-selected="${sel === r.id}">
      <td role="gridcell"><div class="pw-table__run"><span>${esc(r.name)}</span></div></td>
      <td role="gridcell"><span class="pw-table__muted">${r.tpl}</span></td>
      <td role="gridcell">${progressHTML(r.done, r.total)}</td>
      <td role="gridcell"><span class="pw-table__muted">${r.next ? esc(r.next) : "—"}</span></td>
      <td role="gridcell">${r.people.length ? stack(r.people, { more: r.more }) : avatarEmpty()}</td>
      <td role="gridcell">${r.completed ? `<span class="pw-due">${ics("calendar")}<span>${fmt(r.due)}</span></span>` : due(r.kind, fmt(r.due), { hint: true })}</td>
      <td role="gridcell">${badge(r.completed ? "completed" : "progress")}</td>
    </tr>`;
    const visibleRuns = () => {
      const q = filterEl.value.trim().toLowerCase();
      let list = RUNS.filter((r) => !q || (r.name + " " + r.tpl).toLowerCase().includes(q));
      list.sort(cmp[sort.col]); if (sort.dir === "descending") list.reverse();
      return list;
    };
    function renderData(stagger) {
      table.removeAttribute("data-loading"); tbody.removeAttribute("aria-busy");
      const list = visibleRuns();
      if (view === "empty") {
        tbody.innerHTML = `<tr class="pw-table__empty"><td colspan="7"><div class="ds-empty">${ics("runs")}<h3 class="t-heading">No runs yet</h3><p>Launch a run from a template to see it here.</p><button type="button" class="ds-btn" data-variant="secondary">Browse templates</button></div></td></tr>`;
        table.setAttribute("aria-rowcount", 2); return;
      }
      if (!list.length) {
        tbody.innerHTML = `<tr class="pw-table__empty"><td colspan="7"><div class="ds-empty">${ics("search")}<h3 class="t-heading">No matches</h3><p>No runs match “${esc(filterEl.value.trim())}”.</p><button type="button" class="ds-btn" data-variant="secondary" id="rt-clear">Clear filter</button></div></td></tr>`;
        table.setAttribute("aria-rowcount", 2); return;
      }
      tbody.innerHTML = list.map(rowHtml).join("");
      table.setAttribute("aria-rowcount", list.length + 1);
      if (stagger) { tbody.classList.add("enter-stagger"); $$("tr", tbody).forEach((tr, i) => tr.style.setProperty("--i", i)); setTimeout(() => tbody.classList.remove("enter-stagger"), 700); }
      const rows = $$("tr", tbody), cur = rows.find((r) => r.dataset.id === (focusId || sel)) || rows[0];
      rows.forEach((r) => (r.tabIndex = r === cur ? 0 : -1));
    }
    function renderLoading() {
      table.setAttribute("data-loading", ""); tbody.setAttribute("aria-busy", "true");
      const w = [58, 40, 52, 44, 30, 36, 28];
      tbody.innerHTML = Array.from({ length: 6 }, () => `<tr aria-hidden="true">${w.map((x) => `<td><div class="skeleton" style="--w:${x + Math.round(Math.random() * 18)}%"></div></td>`).join("")}</tr>`).join("");
    }
    function flip(mutate) {
      const rows = $$("tr", tbody), first = new Map(rows.map((r) => [r.dataset.id, r.getBoundingClientRect().top]));
      const hadFocus = document.activeElement && document.activeElement.closest && document.activeElement.closest("#rt-body tr");
      mutate();
      const id = hadFocus && hadFocus.dataset.id; if (id) { const n = $(`tr[data-id="${id}"]`, tbody); n && n.focus({ preventScroll: true }); }
      if (!motionOK()) return;
      $$("tr", tbody).forEach((r) => {
        const f = first.get(r.dataset.id); if (f == null) return;
        const dy = f - r.getBoundingClientRect().top;
        if (Math.abs(dy) > 1) r.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: springMs("smooth"), easing: tok("spring-smooth") });
      });
    }
    function setSort(col) {
      const th = $(`th[data-col="${col}"]`, table);
      const next = sort.col === col && sort.dir === "ascending" ? "descending" : "ascending";
      sort = { col, dir: next };
      $$("th[data-col]", table).forEach((h) => h.setAttribute("aria-sort", h === th ? next : "none"));
      flip(() => renderData(false));
      const label = { name: "name", progress: "progress", due: "due date, overdue first", status: "status" }[col];
      msg.textContent = `Sorted by ${label}, ${next === "ascending" ? "ascending" : "descending"}.`;
    }
    table.addEventListener("click", (e) => {
      const s = e.target.closest(".pw-table__sort"); if (s) { setSort(s.closest("th").dataset.col); return; }
      if (e.target.closest("#rt-clear")) { filterEl.value = ""; renderData(true); return; }
      const tr = e.target.closest("#rt-body tr[data-id]"); if (!tr) return;
      selectRun(tr.dataset.id, true);
    });
    function selectRun(id, focus) {
      sel = id; focusId = id;
      $$("tr[data-id]", tbody).forEach((r) => { const on = r.dataset.id === id; r.setAttribute("aria-selected", on); r.tabIndex = on ? 0 : -1; if (on && focus) r.focus({ preventScroll: true }); });
      const run = RUNS.find((r) => r.id === id); msg.textContent = `Selected “${run.name}”. ${progText(run.done, run.total)}.`;
    }
    table.addEventListener("keydown", (e) => {
      const tr = e.target.closest("#rt-body tr[data-id]"); if (!tr) return;
      const rows = $$("tr[data-id]", tbody), i = rows.indexOf(tr);
      const k = e.key.toLowerCase(), go = (n) => { const r = rows[Math.min(rows.length - 1, Math.max(0, n))]; selectRun(r.dataset.id, true); r.scrollIntoView({ block: "nearest" }); };
      if (k === "j" || e.key === "ArrowDown") { e.preventDefault(); go(i + 1); }
      else if (k === "k" || e.key === "ArrowUp") { e.preventDefault(); go(i - 1); }
      else if (e.key === "Home") { e.preventDefault(); go(0); }
      else if (e.key === "End") { e.preventDefault(); go(rows.length - 1); }
      else if (e.key === "Enter") { e.preventDefault(); const run = RUNS.find((r) => r.id === tr.dataset.id); msg.textContent = `Opening “${run.name}”…`; announce(msg.textContent); }
    });
    filterEl.addEventListener("input", () => { if (view === "data") flip(() => renderData(false)); });
    const viewSeg = initSeg($('[data-seg="rt-view"]'), async (v) => {
      view = v;
      if (v === "loading") { renderLoading(); return; }
      renderData(true);
    });
    renderData(false);
    sel = "r3"; selectRun("r3", false);
    $$("th[data-col]", table).forEach((h) => h.setAttribute("aria-sort", h.dataset.col === "due" ? "ascending" : "none"));
  })();

  /* =====================================================================
     06 · Variable editor
     ===================================================================== */
  (() => {
    const ed = $("#ed"), wrap = $("#ed-wrap"), vm = $("#vm"), list = $("#vm-list"), msg = $("#ed-msg");
    ed.innerHTML = `Hi ${varChip("tenant_name")}, welcome to ${varChip("unit")}. Your move-in date is ${varChip("move_in_date")} and the deposit of ${varChip("deposit")} is due before the keys are handed over. Last meter reading: ${varChip("meter_reading")}.`;
    $$(".pw-var", ed).forEach((c) => c.setAttribute("contenteditable", "false"));
    let st = null, active = 0, items = [], mode = "edit";

    const renderChipMode = (c) => {
      const key = c.dataset.var, v = V[key];
      if (mode === "preview") {
        if (v.value) c.outerHTML = varChip(key, "resolved");
        else c.outerHTML = varChip(key, "unresolved");
      }
    };
    const toTemplate = () => { $$(".pw-var", ed).forEach((c) => { c.outerHTML = varChip(c.dataset.var); }); $$(".pw-var", ed).forEach((c) => c.setAttribute("contenteditable", "false")); };
    const modeSeg = initSeg($('[data-seg="ed-mode"]'), (v) => {
      mode = v; closeMenu(true);
      if (v === "preview") { $$(".pw-var", ed).forEach(renderChipMode); ed.contentEditable = "false"; ed.setAttribute("aria-readonly", "true"); msg.textContent = "Showing resolved values. Meter reading has no value yet."; }
      else { toTemplate(); ed.contentEditable = "true"; ed.removeAttribute("aria-readonly"); msg.textContent = "Template mode."; }
    });

    const caretRect = () => {
      const s = getSelection(); if (!s.rangeCount) return null;
      const r = s.getRangeAt(0).cloneRange(); r.collapse(true);
      return r.getClientRects()[0] || r.getBoundingClientRect() || null;
    };
    const hl = (label, q) => { if (!q) return esc(label); const i = label.toLowerCase().indexOf(q.toLowerCase()); return i < 0 ? esc(label) : `${esc(label.slice(0, i))}<mark>${esc(label.slice(i, i + q.length))}</mark>${esc(label.slice(i + q.length))}`; };
    function filtered(q) {
      q = q.replace(/\s+/g, " ").trim().toLowerCase();
      return VARS.filter((v) => !q || v.label.toLowerCase().includes(q) || v.key.includes(q.replace(/ /g, "_")));
    }
    function renderMenu(q) {
      items = filtered(q); active = Math.min(active, Math.max(0, items.length - 1));
      if (!items.length) { list.innerHTML = `<div class="pw-varmenu__empty">No matches</div>`; ed.removeAttribute("aria-activedescendant"); return; }
      let n = 0, html = "";
      for (const g of ["Form fields", "Run", "Template"]) {
        const gi = items.filter((v) => v.group === g); if (!gi.length) continue;
        html += `<div class="pw-varmenu__group" role="group" aria-label="${g}"><span class="pw-varmenu__label">${g}</span>${gi.map((v) => { const i = n++; return `<div class="pw-varmenu__opt" role="option" id="vm-o${i}" data-i="${i}" aria-selected="${i === active}">${ic("braces", "pw-var__icon", 'data-size="sm"')}<span>${hl(v.label, q)}</span><span class="pw-varmenu__val"${v.value ? "" : " data-empty"}>${v.value ? esc(v.value) : "No value yet"}</span></div>`; }).join("")}</div>`;
      }
      // keep items sorted by menu order so indices match
      items = ["Form fields", "Run", "Template"].flatMap((g) => items.filter((v) => v.group === g));
      list.innerHTML = html;
      ed.setAttribute("aria-activedescendant", `vm-o${active}`);
    }
    function position() {
      const rect = caretRect() || ed.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      let left = rect.left - w.left - 8, top = rect.bottom - w.top + 6, origin = "top left", dir = -1;
      left = Math.max(0, Math.min(left, w.width - 284));
      vm.style.left = left + "px"; vm.style.top = top + "px";
      const h = vm.offsetHeight;
      if (rect.bottom + h + 12 > innerHeight && rect.top > h + 24) { vm.style.top = rect.top - w.top - h - 6 + "px"; origin = "bottom left"; dir = 1; }
      vm.style.setProperty("--origin", origin); vm.style.setProperty("--pop-dir", dir);
    }
    function openMenu(q) {
      const was = !vm.hidden;
      renderMenu(q);
      if (!was) { vm.hidden = false; vm.classList.remove("exit"); position(); vm.classList.remove("pop-in"); void vm.offsetWidth; vm.classList.add("pop-in"); ed.setAttribute("aria-expanded", "true"); }
      else position();
    }
    function closeMenu(now) {
      if (vm.hidden) return;
      ed.setAttribute("aria-expanded", "false"); ed.removeAttribute("aria-activedescendant"); st = null;
      if (now || !motionOK()) { vm.hidden = true; return; }
      vm.classList.remove("pop-in"); vm.classList.add("exit");
      setTimeout(() => { if (vm.classList.contains("exit")) { vm.hidden = true; vm.classList.remove("exit"); } }, tokMs("duration-base") * 0.7);
    }
    function check() {
      if (mode !== "edit") return;
      const s = getSelection(); if (!s.rangeCount || !s.isCollapsed) return closeMenu();
      const n = s.anchorNode, o = s.anchorOffset;
      if (!n || n.nodeType !== 3 || !ed.contains(n)) return closeMenu();
      const m = /\{{1,2}([A-Za-z_ ]{0,24})$/.exec(n.data.slice(0, o));
      if (!m) return closeMenu();
      st = { node: n, end: o, start: o - m[0].length, q: m[1] };
      active = 0; openMenu(m[1]);
    }
    function insert(v) {
      if (!st) return;
      const r = document.createRange(); r.setStart(st.node, st.start); r.setEnd(st.node, st.end); r.deleteContents();
      const chip = document.createElement("span"); chip.innerHTML = varChip(v.key); const c = chip.firstElementChild; c.setAttribute("contenteditable", "false"); c.classList.add("enter-pop");
      r.insertNode(c);
      const nxt = c.nextSibling, nextCh = nxt && nxt.nodeType === 3 ? nxt.data[0] : "";
      let caretNode;
      if (nextCh && /[\s.,;:!?)]/.test(nextCh)) { caretNode = nxt; } else { caretNode = document.createTextNode(" "); c.after(caretNode); }
      const s = getSelection(), nr = document.createRange(); nr.setStart(caretNode, nxt && caretNode === nxt ? 0 : caretNode.length); nr.collapse(true); s.removeAllRanges(); s.addRange(nr);
      closeMenu(); ed.focus();
      msg.textContent = `Inserted ${v.label}.`; announce(`Inserted variable ${v.label}.`);
      setTimeout(() => c.classList.remove("enter-pop"), 400);
    }
    ed.addEventListener("input", check);
    ed.addEventListener("keyup", (e) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) check(); });
    ed.addEventListener("click", (e) => {
      $$(".pw-var[data-selected]", ed).forEach((x) => x.removeAttribute("data-selected"));
      const c = e.target.closest(".pw-var"); if (c && mode === "edit") { c.setAttribute("data-selected", ""); const r = document.createRange(); r.selectNode(c); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } else check();
    });
    ed.addEventListener("keydown", (e) => {
      $$(".pw-var[data-selected]", ed).forEach((x) => x.removeAttribute("data-selected"));
      if (vm.hidden) return;
      const move = (d) => { e.preventDefault(); if (!items.length) return; active = (active + d + items.length) % items.length; $$(".pw-varmenu__opt", list).forEach((o) => o.setAttribute("aria-selected", +o.dataset.i === active)); ed.setAttribute("aria-activedescendant", `vm-o${active}`); $(`#vm-o${active}`, list).scrollIntoView({ block: "nearest" }); };
      if (e.key === "ArrowDown") move(1);
      else if (e.key === "ArrowUp") move(-1);
      else if (e.key === "Enter" || e.key === "Tab") { if (items[active]) { e.preventDefault(); insert(items[active]); } else closeMenu(); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeMenu(); }
    });
    ed.addEventListener("blur", () => setTimeout(() => { if (!vm.contains(document.activeElement)) closeMenu(); }, 100));
    vm.addEventListener("mousedown", (e) => e.preventDefault());
    vm.addEventListener("mousemove", (e) => { const o = e.target.closest(".pw-varmenu__opt"); if (!o || +o.dataset.i === active) return; active = +o.dataset.i; $$(".pw-varmenu__opt", list).forEach((x) => x.setAttribute("aria-selected", +x.dataset.i === active)); ed.setAttribute("aria-activedescendant", `vm-o${active}`); });
    vm.addEventListener("click", (e) => { const o = e.target.closest(".pw-varmenu__opt"); if (o && items[+o.dataset.i]) insert(items[+o.dataset.i]); });
    $("#ed-insert").addEventListener("click", () => {
      if (mode !== "edit") return;
      ed.focus();
      const s = getSelection();
      if (!s.rangeCount || !ed.contains(s.anchorNode)) { const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
      document.execCommand("insertText", false, "{");
    });
  })();

  /* =====================================================================
     07 · AI draft
     ===================================================================== */
  (() => {
    const ai = $("#ai"), listEl = $("#ai-list"), step = $("#ai-step"), count = $("#ai-count"), allBtn = $("#ai-all");
    const state = AI_FIELDS.map(() => "draft");
    let token = 0, stepNote = "";
    listEl.innerHTML = AI_FIELDS.map((f, i) => aiFieldHTML(f, { i, tab: i === 0 ? 0 : -1 })).join("");
    const rows = () => $$(".pw-aifield", listEl);
    const reviewed = () => state.filter((s) => s === "accepted" || s === "rejected").length;
    const statusWord = { accepted: "Accepted", rejected: "Rejected", draft: "", loading: "" };
    function paint(i) {
      const r = rows()[i], s = state[i];
      r.dataset.state = s; $(".pw-aifield__status", r).textContent = statusWord[s];
      const pending = s === "draft";
      $("[data-act='accept']", r).hidden = !pending; $("[data-act='reject']", r).hidden = !pending; $("[data-act='undo']", r).hidden = pending || s === "loading";
      r.setAttribute("aria-label", `${AI_FIELDS[i].k}: ${AI_FIELDS[i].v}, ${s === "draft" ? "AI draft" : s} from lease.pdf ${AI_FIELDS[i].p}, confidence ${CONF_LABEL[AI_FIELDS[i].c]}`);
    }
    function summary() {
      const n = reviewed(), t = AI_FIELDS.length;
      count.textContent = `${n} of ${t} reviewed`;
      const open = state.filter((s) => s === "draft").length;
      step.textContent = open ? (stepNote || `Found ${t} fields · review before they are used`) : `All ${t} fields reviewed · ${state.filter((s) => s === "accepted").length} accepted`;
      allBtn.setAttribute("aria-disabled", open === 0 || ai.getAttribute("aria-busy") === "true" ? "true" : "false");
    }
    function focusNextPending(from) {
      const rs = rows(), n = [...state.keys()].find((i) => i > from && state[i] === "draft") ?? [...state.keys()].find((i) => state[i] === "draft");
      const idx = n ?? from; setTab(idx); rs[idx].focus({ preventScroll: true });
    }
    function setTab(i) { rows().forEach((r, k) => (r.tabIndex = k === i ? 0 : -1)); }
    function decide(i, to, viaKeyboard) {
      if (ai.getAttribute("aria-busy") === "true") return;
      if (state[i] === to) return;
      state[i] = to; stepNote = ""; paint(i); summary();
      announce(`${AI_FIELDS[i].k} ${to === "draft" ? "restored to draft" : to}. ${reviewed()} of ${AI_FIELDS.length} reviewed.`);
      if (viaKeyboard && to !== "draft") focusNextPending(i);
    }
    function acceptAll() {
      if (ai.getAttribute("aria-busy") === "true") return;
      let n = 0, skipped = 0;
      state.forEach((s, i) => { if (s !== "draft") return; if (AI_FIELDS[i].c === "low") { skipped++; return; } state[i] = "accepted"; n++; setTimeout(() => { paint(i); }, motionOK() ? n * 70 : 0); });
      /* the note is set once, synchronously: summary() (also called by decide/parse) only reads it, never rebuilds it */
      const left = skipped === 1 ? "1 low-confidence field needs a decision" : `${skipped} low-confidence fields need a decision`;
      stepNote = skipped ? (n ? `Accepted ${n} · ${left}` : `Nothing to accept · ${left}`) : "";
      if (skipped) step.textContent = stepNote;
      setTimeout(summary, motionOK() ? n * 70 + 20 : 0);
      announce(`Accepted ${n} fields.${skipped ? ` ${left}.` : ""}`);
    }
    listEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]"), r = e.target.closest(".pw-aifield"); if (!r) return;
      const i = +r.dataset.i; setTab(i);
      if (e.target.closest(".pw-prov")) { announce(`Opens lease.pdf at ${AI_FIELDS[i].p}`); return; }
      if (!b) return;
      b.dataset.act === "accept" ? decide(i, "accepted") : b.dataset.act === "reject" ? decide(i, "rejected") : decide(i, "draft");
    });
    listEl.addEventListener("keydown", (e) => {
      const r = e.target.closest(".pw-aifield"); if (!r || e.target !== r) return;
      const i = +r.dataset.i, rs = rows();
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const n = Math.min(rs.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1))); setTab(n); rs[n].focus(); }
      else if (e.key === "Home" || e.key === "End") { e.preventDefault(); const n = e.key === "Home" ? 0 : rs.length - 1; setTab(n); rs[n].focus(); }
      else if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); acceptAll(); }
      else if (e.key === "Enter") { e.preventDefault(); decide(i, "accepted", true); }
      else if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); decide(i, "rejected", true); }
      else if (e.key.toLowerCase() === "z") { e.preventDefault(); decide(i, "draft"); }
    });
    allBtn.addEventListener("click", acceptAll);
    async function parse() {
      const my = ++token; stepNote = "";
      ai.setAttribute("aria-busy", "true"); allBtn.setAttribute("aria-disabled", "true");
      state.fill("draft"); count.textContent = `0 of ${AI_FIELDS.length} reviewed`;
      rows().forEach((r, i) => { r.dataset.state = "loading"; r.classList.remove("enter"); $(".pw-aifield__status", r).textContent = ""; $("[data-act='accept']", r).hidden = false; $("[data-act='reject']", r).hidden = false; $("[data-act='undo']", r).hidden = true; });
      step.textContent = "Reading lease.pdf…"; await wait(900); if (my !== token) return;
      step.textContent = "Reading lease.pdf… found 3 fields"; await wait(700); if (my !== token) return;
      step.textContent = "Reading lease.pdf… found 7 fields"; await wait(600); if (my !== token) return;
      for (let i = 0; i < AI_FIELDS.length; i++) {
        const r = rows()[i]; r.dataset.state = "draft";
        if (motionOK()) { r.style.animationDelay = i * 60 + "ms"; r.classList.add("enter"); }
      }
      await wait(AI_FIELDS.length * 60 + 300); if (my !== token) return;
      rows().forEach((r) => { r.classList.remove("enter"); r.style.animationDelay = ""; });
      ai.setAttribute("aria-busy", "false"); summary();
      announce(`Found ${AI_FIELDS.length} fields in lease.pdf.`);
    }
    $("#ai-rerun").addEventListener("click", parse);
    summary();
    /* run the parse once when the section first scrolls into view */
    const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { io.disconnect(); parse(); } }, { threshold: 0.35 });
    io.observe(ai);
  })();

  /* =====================================================================
     08 · Invoice
     ===================================================================== */
  (() => {
    const VAT = 0.21;
    const lines = [
      { id: 1, item: "Apartment inspection", task: "Inspect the apartment", qty: 1, price: 120 },
      { id: 2, item: "Meter reading", task: "Read the meters", qty: 1, price: 30 },
      { id: 3, item: "Photo report", task: "Photograph the rooms", qty: 1, price: 45 },
      { id: 4, item: "Key set", task: "Hand over the keys", qty: 2, price: 15 },
      { id: 5, item: "Deep clean", task: "Inspect the apartment", qty: 1, price: 180, draft: true }
    ];
    let status = "draft";
    const inv = $("#inv"), body = $("#inv-body"), note = $("#inv-note"), badgeHost = $("#inv-badge");
    badgeHost.innerHTML = badge("draft");
    const lineHTML = (l) => `<tr data-id="${l.id}"${l.draft ? " data-draft" : ""}>
      <td><span class="pw-invoice__item"><span>${l.item}</span>${l.draft ? badge("ai", { size: "sm" }) : ""}</span></td>
      <td><span class="pw-invoice__task">${ics("check")}<span>${l.task}</span></span></td>
      <td data-center><span class="pw-qty"><button type="button" tabindex="-1" data-q="-1" aria-label="Decrease quantity">${ics("minus")}</button><span class="pw-qty__val num" role="spinbutton" tabindex="0" aria-label="Quantity, ${l.item}" aria-valuemin="1" aria-valuemax="99" aria-valuenow="${l.qty}">${l.qty}</span><button type="button" tabindex="-1" data-q="1" aria-label="Increase quantity">${ics("plus")}</button></span></td>
      <td data-num>${money(l.price)}</td>
      <td data-num data-amount>${money(l.qty * l.price)}</td>
      <td class="pw-invoice__rowact">${l.draft ? `<button type="button" class="pw-iconbtn" data-act="accept" aria-label="Accept ${l.item}" title="Accept line">${ics("check")}</button><button type="button" class="pw-iconbtn" data-act="reject" aria-label="Reject ${l.item}" title="Reject line">${ics("x")}</button>` : ""}</td>
    </tr>`;
    body.innerHTML = lines.map(lineHTML).join("");
    body.insertAdjacentHTML("beforeend", "");
    const tSub = $("#t-sub"), tVat = $("#t-vat"), tTot = $("#t-tot");
    tSub.innerHTML = tickerInner(money(0)); tVat.innerHTML = tickerInner(money(0)); tTot.innerHTML = tickerInner(money(0));
    tSub.dataset.text = tVat.dataset.text = tTot.dataset.text = money(0);
    function totals(first) {
      const sub = lines.filter((l) => !l.draft).reduce((s, l) => s + l.qty * l.price, 0), vat = Math.round(sub * VAT * 100) / 100, tot = sub + vat;
      if (first) { [[tSub, sub], [tVat, vat], [tTot, tot]].forEach(([el, v]) => { el.setAttribute("data-instant", ""); tickerSet(el, money(v)); void el.offsetWidth; el.removeAttribute("data-instant"); }); }
      else { tickerSet(tSub, money(sub)); tickerSet(tVat, money(vat)); tickerSet(tTot, money(tot)); }
      $("#t-sub-s").textContent = money(sub); $("#t-vat-s").textContent = money(vat); $("#t-tot-s").textContent = money(tot);
      const drafts = lines.filter((l) => l.draft).length;
      note.innerHTML = drafts ? `${ics("spark")}<span>${drafts} AI-suggested ${drafts === 1 ? "line isn’t" : "lines aren’t"} in the total until you accept ${drafts === 1 ? "it" : "them"}.</span>` : status === "draft" ? `<span>Every line comes from a completed task.</span>` : status === "issued" ? `<span>Issued 23 Oct 2026 · payment due in 14 days.</span>` : `<span>Paid in full. Thank you.</span>`;
    }
    totals(true);
    // first-time roll: from zero to the real values when scrolled into view
    const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { io.disconnect(); setTimeout(() => totals(false), 150); } }, { threshold: 0.4 });
    tSub.dataset.text = tVat.dataset.text = tTot.dataset.text = money(0); [tSub, tVat, tTot].forEach((el) => (el.innerHTML = tickerInner(money(0))));
    io.observe(inv);
    function updateLine(l) {
      const tr = $(`tr[data-id="${l.id}"]`, body);
      $("[data-amount]", tr).textContent = money(l.qty * l.price);
      const v = $(".pw-qty__val", tr); v.textContent = l.qty; v.setAttribute("aria-valuenow", l.qty);
      totals(false);
    }
    body.addEventListener("click", (e) => {
      const tr = e.target.closest("tr"); if (!tr) return;
      const l = lines.find((x) => x.id === +tr.dataset.id), q = e.target.closest("[data-q]"), act = e.target.closest("[data-act]");
      if (status !== "draft") return;
      if (q) { l.qty = Math.min(99, Math.max(1, l.qty + +q.dataset.q)); updateLine(l); }
      if (act && act.dataset.act === "accept") {
        l.draft = false; tr.removeAttribute("data-draft");
        $(".pw-badge", tr)?.remove(); $(".pw-invoice__rowact", tr).innerHTML = "";
        if (motionOK()) tr.animate([{ backgroundColor: "color-mix(in oklch, var(--status-done) 14%, transparent)" }, { backgroundColor: "transparent" }], { duration: tokMs("duration-slow"), easing: tok("ease-standard") });
        totals(false); announce(`${l.item} accepted. Total updated.`);
      }
      if (act && act.dataset.act === "reject") {
        lines.splice(lines.indexOf(l), 1);
        const done = () => { tr.remove(); totals(false); announce(`${l.item} rejected.`); };
        if (motionOK() && tr.animate) { tr.animate([{ opacity: 1 }, { opacity: 0 }], { duration: tokMs("duration-base") * 0.7, easing: tok("ease-exit") }).finished.then(done); } else done();
      }
    });
    body.addEventListener("keydown", (e) => {
      const v = e.target.closest(".pw-qty__val"); if (!v || status !== "draft") return;
      const l = lines.find((x) => x.id === +v.closest("tr").dataset.id);
      const d = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key]; if (!d) return;
      e.preventDefault(); l.qty = Math.min(99, Math.max(1, l.qty + d)); updateLine(l);
    });
    const seg = initSeg($('[data-seg="inv-status"]'), (v) => {
      if (v !== "draft" && lines.some((l) => l.draft)) {
        note.innerHTML = `${ics("alert")}<span>Accept or reject the AI-suggested line before issuing.</span>`; note.setAttribute("data-tone", "error");
        announce("Accept or reject the AI-suggested line before issuing.");
        seg.set("draft", { silent: true }); setTimeout(() => { note.removeAttribute("data-tone"); totals(false); }, 2600); return;
      }
      status = v; note.removeAttribute("data-tone");
      setBadge($(".pw-badge", badgeHost), v);
      v === "draft" ? inv.removeAttribute("data-locked") : inv.setAttribute("data-locked", "");
      $$(".pw-qty__val", body).forEach((q) => (v === "draft" ? q.removeAttribute("aria-readonly") : q.setAttribute("aria-readonly", "true")));
      totals(false);
    });
  })();

  /* =====================================================================
     09 · Sidebar
     ===================================================================== */
  const NAV = [
    { id: "tasks", label: "My tasks", icon: "tasks", count: 4 },
    { id: "runs", label: "Runs", icon: "runs", count: 12, current: true, dot: true },
    { h: "Library" },
    { id: "templates", label: "Templates", icon: "template" },
    { id: "data", label: "Data sets", icon: "database", count: 3 },
    { h: "Billing" },
    { id: "invoices", label: "Invoices", icon: "receipt", count: 2 }
  ];
  const sidebarHTML = (collapsed, live) => `<nav class="pw-sidebar" data-collapsed="${collapsed}" aria-label="Main">
    <div class="pw-sidebar__top">
      <button type="button" class="pw-ws" ${live ? 'data-ws aria-haspopup="menu" aria-expanded="false"' : ""} aria-label="Workspace: Example Estates"><span class="pw-ws__mark" aria-hidden="true">E</span><span class="pw-ws__name pw-sidebar__fade">Example Estates</span><svg class="pw-sidebar__fade" aria-hidden="true"><use href="#i-updown"/></svg></button>
      <button type="button" class="pw-iconbtn pw-sidebar__toggle pw-sidebar__fade" ${live ? "data-toggle" : ""} aria-label="Collapse sidebar" aria-expanded="${!collapsed}" title="Collapse sidebar  [">${ics("panel")}</button>
    </div>
    <button type="button" class="pw-search" ${live ? "data-search" : ""} aria-label="Search, command K">${ics("search")}<span class="pw-search__label pw-sidebar__fade">Search…</span><span class="pw-search__keys pw-sidebar__fade" aria-hidden="true"><kbd>⌘</kbd><kbd>K</kbd></span></button>
    <div class="pw-nav" role="list">
      ${NAV.map((n) => n.h ? `<span class="pw-nav__heading" role="presentation"><span class="pw-sidebar__fade">${n.h}</span></span>` : `<a class="pw-nav__item" role="listitem" href="#sidebar" data-nav="${n.id}" data-tip="${n.label}"${n.count ? ` data-tipc="${n.count}"` : ""}${n.current ? ' aria-current="page"' : ""}>${ics(n.icon)}<span class="pw-nav__label pw-sidebar__fade">${n.label}</span>${n.count ? `<span class="pw-nav__count pw-sidebar__fade num">${n.count}</span>` : ""}${n.dot ? '<span class="pw-nav__dot" aria-hidden="true"></span>' : ""}</a>`).join("")}
    </div>
    <div class="pw-sidebar__foot">
      <span class="pw-person">${avatar("manager@example.test")}<span class="pw-person__text pw-sidebar__fade"><span class="pw-person__name">manager@example.test</span><span class="pw-person__sub">Manager</span></span></span>
    </div>
  </nav>`;

  (() => {
    const stage = $("#sb-stage"), mount = $('[data-mount="sidebar-live"]');
    mount.outerHTML = sidebarHTML(false, true);
    const sb = $(".pw-sidebar", stage);
    const tools = document.createElement("div");
    tools.className = "ds-sb-stage__tools";
    tools.innerHTML = `<button type="button" class="ds-btn" data-variant="secondary" data-size="sm" id="sb-btn" aria-expanded="true">${ics("panel")}<span id="sb-btn-l">Collapse</span><span class="pw-kbd">[</span></button>`;
    stage.appendChild(tools);
    const btn = $("#sb-btn", stage), tg = $("[data-toggle]", sb);
    let tip = null;
    const hideTip = () => { if (tip) { tip.remove(); tip = null; } };
    function setCollapsed(c) {
      sb.dataset.collapsed = c; stage.dataset.collapsed = c;
      btn.setAttribute("aria-expanded", !c); $("#sb-btn-l").textContent = c ? "Expand" : "Collapse";
      tg.setAttribute("aria-expanded", !c); tg.setAttribute("aria-label", c ? "Expand sidebar" : "Collapse sidebar");
      $$(".pw-sidebar__fade", sb).forEach((el) => { c ? el.setAttribute("aria-hidden", "true") : el.removeAttribute("aria-hidden"); });
      hideTip(); closeWs();
      announce(c ? "Sidebar collapsed" : "Sidebar expanded");
    }
    const toggle = () => setCollapsed(sb.dataset.collapsed !== "true");
    btn.addEventListener("click", toggle); tg.addEventListener("click", toggle);
    document.addEventListener("keydown", (e) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target; if (t.closest && t.closest("input, textarea, [contenteditable='true']")) return;
      toggle();
    });
    /* tooltips for the rail */
    function showTip(el, label, count) {
      if (sb.dataset.collapsed !== "true") return;
      hideTip();
      tip = document.createElement("div"); tip.className = "pw-tooltip pop-in"; tip.setAttribute("role", "tooltip");
      tip.innerHTML = `<span>${label}</span>${count ? `<kbd>${count}</kbd>` : ""}`;
      document.body.appendChild(tip);
      /* anchor to the visible rail edge, not to the (clipped, 240px-wide) element */
      const r = el.getBoundingClientRect(), cw = parseFloat(getComputedStyle(sb).getPropertyValue("--size-sidebar-collapsed")) || 48;
      tip.style.left = Math.min(r.right, sb.getBoundingClientRect().left + cw) + 6 + "px"; tip.style.top = r.top + (r.height - tip.offsetHeight) / 2 + "px";
    }
    addEventListener("scroll", hideTip, { passive: true });
    sb.addEventListener("mouseover", (e) => { const a = e.target.closest("[data-tip], .pw-ws, .pw-search"); if (a) showTip(a, a.dataset.tip || (a.matches(".pw-ws") ? "Expand sidebar" : "Search"), a.dataset.tipc || (a.matches(".pw-search") ? "⌘K" : "")); });
    sb.addEventListener("mouseout", (e) => { if (e.target.closest("[data-tip], .pw-ws, .pw-search")) hideTip(); });
    sb.addEventListener("focusin", (e) => { const a = e.target.closest("[data-tip], .pw-ws, .pw-search"); if (a && a.matches(":focus-visible")) showTip(a, a.dataset.tip || (a.matches(".pw-ws") ? "Expand sidebar" : "Search"), a.dataset.tipc || ""); });
    sb.addEventListener("focusout", hideTip);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { hideTip(); closeWs(); } });
    /* nav: current page */
    sb.addEventListener("click", (e) => {
      const a = e.target.closest(".pw-nav__item"); if (!a) return;
      e.preventDefault();
      $$(".pw-nav__item", sb).forEach((x) => (x === a ? x.setAttribute("aria-current", "page") : x.removeAttribute("aria-current")));
    });
    sb.addEventListener("click", (e) => { if (e.target.closest("[data-search]")) { if (sb.dataset.collapsed === "true") return; announce("Command palette opens here."); } });
    /* workspace switcher (menu lives outside the sidebar so the collapse clip cannot cut it) */
    const ws = $("[data-ws]", sb);
    const menu = document.createElement("div");
    menu.className = "pw-varmenu pw-wsmenu"; menu.hidden = true; menu.setAttribute("role", "menu"); menu.setAttribute("aria-label", "Workspaces");
    menu.innerHTML = `<div class="pw-varmenu__group" role="group" aria-label="Workspaces"><span class="pw-varmenu__label">Workspaces</span>
      <button type="button" class="pw-varmenu__opt" role="menuitemradio" aria-checked="true"><span class="pw-ws__mark" style="width:18px;height:18px">E</span><span>Example Estates</span><span class="pw-varmenu__val">${ics("check")}</span></button>
      <button type="button" class="pw-varmenu__opt" role="menuitemradio" aria-checked="false"><span class="pw-ws__mark" style="width:18px;height:18px;background:var(--chart-2);color:var(--background)">R</span><span>Riverside Lettings</span></button>
    </div><div class="pw-varmenu__group" role="group"><button type="button" class="pw-varmenu__opt" role="menuitem">${ics("plus")}<span>Create workspace</span></button></div>`;
    stage.appendChild(menu);
    function closeWs() { if (menu.hidden) return; ws.setAttribute("aria-expanded", "false"); if (!motionOK()) { menu.hidden = true; return; } menu.classList.remove("pop-in"); menu.classList.add("exit"); setTimeout(() => { menu.hidden = true; menu.classList.remove("exit"); }, tokMs("duration-base") * 0.7); }
    function openWs() { menu.hidden = false; menu.classList.remove("exit", "pop-in"); void menu.offsetWidth; menu.classList.add("pop-in"); ws.setAttribute("aria-expanded", "true"); $("[role='menuitemradio']", menu).focus(); }
    ws.addEventListener("click", () => { if (sb.dataset.collapsed === "true") { toggle(); return; } menu.hidden ? openWs() : closeWs(); });
    menu.addEventListener("keydown", (e) => { const its = $$("[role^='menuitem']", menu), i = its.indexOf(document.activeElement); if (e.key === "ArrowDown") { e.preventDefault(); its[(i + 1) % its.length].focus(); } else if (e.key === "ArrowUp") { e.preventDefault(); its[(i - 1 + its.length) % its.length].focus(); } else if (e.key === "Escape") { e.stopPropagation(); closeWs(); ws.focus(); } });
    menu.addEventListener("click", (e) => { const it = e.target.closest("[role='menuitemradio']"); if (it) { $$("[role='menuitemradio']", menu).forEach((x) => x.setAttribute("aria-checked", x === it)); } closeWs(); ws.focus(); });
    document.addEventListener("pointerdown", (e) => { if (!menu.hidden && !menu.contains(e.target) && !ws.contains(e.target)) closeWs(); });
    setCollapsed(false);
    /* static frames */
    $$("#sb-frames .ds-sb-frame").forEach((f) => { f.innerHTML = sidebarHTML(f.hasAttribute("data-collapsed"), false); $$("a", f).forEach((a) => a.addEventListener("click", (e) => e.preventDefault())); });
  })();

  /* =====================================================================
     10 · Run page
     ===================================================================== */
  (() => {
    const rp = $("#rp");
    const DETAIL = {
      t1: { sec: "Before move-in", desc: "Walk through every room with the tenant and note anything that needs repair before the keys change hands.", fields: [["Inspector", "alex@example.test"], ["Inspection date", "23 Oct 2026"]] },
      t2: { sec: "Before move-in", desc: "Read the electricity and water meters and enter the values.", fields: [["Electricity (kWh)", "12,480"], ["Water (m³)", "342"]] },
      t3: { sec: "Before move-in", desc: "Take at least one photo of every room. Add anything unusual to the notes.", fields: [["Photos", "__drop"], ["Notes", ""]] },
      t4: { sec: "Move-in day", desc: `Ask ${varChip("tenant_name", "resolved")} to read and sign the handover form for ${varChip("unit", "resolved")}.`, fields: [["Signed by", "Alex Example"], ["Signed on", "24 Oct 2026"]] },
      t5: { sec: "Move-in day", desc: `Hand ${varChip("tenant_name", "resolved")} the two key sets for ${varChip("unit", "resolved")} and write down the tag number.`, fields: [["Key sets", "2"], ["Tag number", "T-114"]] }
    };
    const rpSections = [
      { name: "Before move-in", tasks: [
        { id: "t1", title: "Inspect the apartment", req: true, done: true, assignee: "alex@example.test", due: { kind: "normal", text: "20 Oct" } },
        { id: "t2", title: "Read the meters", req: true, done: true, assignee: "sam@example.test" },
        { id: "t3", title: "Photograph the rooms", req: false, assignee: "alex@example.test", due: { kind: "overdue", text: "22 Oct" } }
      ] },
      { name: "Move-in day", tasks: [
        { id: "t4", title: "Sign the handover form", req: true, stop: true, assignee: "manager@example.test", due: { kind: "due-soon", text: "24 Oct" } },
        { id: "t5", title: "Hand over the keys", req: true, assignee: "sam@example.test" }
      ] }
    ];
    const kvVars = [
      { key: "tenant_name", label: "Tenant name", v: "Alex Example", on: true },
      { key: "unit", label: "Unit", v: "Apt 12", on: true },
      { key: "move_in_date", label: "Move-in date", v: "24 Oct 2026", on: false },
      { key: "deposit", label: "Deposit", v: "€1,250.00", on: false },
      { key: "key_tag", label: "Key tag", v: "T-114", on: false }
    ];
    const miniAI = [
      { k: "Move-in date", v: "24 Oct 2026", p: "p. 2", c: "high", varKey: "move_in_date" },
      { k: "Deposit", v: "€1,250.00", p: "p. 3", c: "check", varKey: "deposit" },
      { k: "Monthly rent", v: "€980.00", p: "p. 3", c: "high" }
    ];
    const miniState = miniAI.map(() => "draft");
    rp.innerHTML = `<div class="pw-runpage__bar">
        <div class="pw-runpage__crumbs"><span>Runs</span>${ics("chev")}<b>Apartment 12, move-in</b></div>
        <span id="rp-prog">${progressHTML(2, 5)}</span>
        <span id="rp-badge">${badge("progress")}</span>
        ${stack(["alex", "sam", "vendor"], { more: 3 })}
      </div>
      <div class="pw-runpage__zones">
        <section class="pw-runpage__zone pw-runpage__list" aria-label="Checklist">
          <div class="pw-runpage__head"><div class="split"><span class="t-label t-strong">Checklist</span><span class="t-meta t-muted" id="rp-req">2 required left</span></div>${barHTML(0.4)}</div>
          <div id="rp-list"></div>
        </section>
        <section class="pw-runpage__zone" aria-label="Task details" aria-live="off"><div class="pw-detail" id="rp-detail"></div></section>
        <aside class="pw-runpage__zone" aria-label="Variables and documents">
          <div class="pw-panel-sec"><div class="pw-panel-sec__head"><span>Variables</span><span class="num" id="rp-varcount"></span></div><div id="rp-vars"></div></div>
          <div class="pw-panel-sec"><div class="pw-panel-sec__head"><span>Documents</span></div>
            <div class="pw-doc"><span class="pw-doc__icon">${ics("file")}</span><span class="pw-doc__text"><span class="pw-doc__name">lease.pdf</span><span class="pw-doc__sub">PDF · 5 pages · read by AI</span></span></div>
            <div class="pw-mini-ai" id="rp-ai" role="list" aria-label="AI draft fields"></div>
          </div>
        </aside>
      </div>`;
    const bar = $(".pw-bar", rp), progEl = $("#rp-prog .pw-progress"), badgeEl = $("#rp-badge .pw-badge");
    /* variables panel */
    function paintVars(animKey) {
      $("#rp-vars").innerHTML = kvVars.map((v) => `<div class="pw-kv"><span>${v.label}</span><span>${v.on ? `<span class="num${animKey === v.key ? " enter" : ""}">${esc(v.v)}</span>` : varChip(v.key === "key_tag" ? "meter_reading" : v.key, "unresolved").replace(/<span>[^<]*<\/span>(?=<\/span>$)/, `<span>Not set yet</span>`)}</span></div>`).join("");
      $("#rp-varcount").textContent = `${kvVars.filter((v) => v.on).length} of ${kvVars.length} set`;
    }
    function paintAI() {
      $("#rp-ai").innerHTML = miniAI.map((f, i) => `<div class="pw-aifield" role="listitem" data-i="${i}" data-state="${miniState[i]}">
        <span class="pw-aifield__label">${f.k}</span>
        <span class="pw-aifield__value"><svg class="pw-aifield__spark" aria-hidden="true"><use href="#i-spark"/></svg><span>${esc(f.v)}</span><svg class="pw-aifield__ok" aria-hidden="true"><use href="#i-check"/></svg></span>
        <span class="pw-aifield__actions">${miniState[i] === "draft" ? `<button type="button" class="pw-iconbtn" data-act="accept" aria-label="Accept ${f.k}" title="Accept">${ics("check")}</button><button type="button" class="pw-iconbtn" data-act="reject" aria-label="Reject ${f.k}" title="Reject">${ics("x")}</button>` : `<button type="button" class="pw-iconbtn" data-act="undo" aria-label="Undo" title="Undo">${ics("undo")}</button>`}</span>
        <span class="pw-aifield__under">${prov("lease.pdf · " + f.p)}${conf(f.c)}</span>
      </div>`).join("");
    }
    $("#rp-ai").addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const i = +b.closest(".pw-aifield").dataset.i, f = miniAI[i];
      const row = b.closest(".pw-aifield");
      miniState[i] = b.dataset.act === "accept" ? "accepted" : b.dataset.act === "reject" ? "rejected" : "draft";
      if (f.varKey) { const kv = kvVars.find((v) => v.key === f.varKey); kv.on = miniState[i] === "accepted"; }
      row.dataset.state = miniState[i];
      const acts = $(".pw-aifield__actions", row);
      setTimeout(() => { paintAI(); paintVars(miniState[i] === "accepted" ? f.varKey : null); }, motionOK() ? 420 : 0);
      announce(`${f.k} ${miniState[i] === "draft" ? "restored" : miniState[i]}.`);
    });
    /* checklist */
    const detailEl = $("#rp-detail");
    let list;
    function paintDetail(t) {
      const d = DETAIL[t.id], lk = list.lockedBy(t), isNext = list.nextReq() === t;
      const field = ([label, val]) => val === "__drop" ? `<div class="ds-field"><span class="ds-field__label">${label}</span><div class="ds-drop">${ics("plus")}Choose files<span class="t-meta t-muted" style="margin-left:auto">or drop here</span></div></div>` : `<div class="ds-field"><label class="ds-field__label" for="rp-f-${esc(label)}">${label}</label><input class="ds-input" id="rp-f-${esc(label)}" value="${esc(val)}" ${t.done ? "readonly" : ""} autocomplete="off"></div>`;
      detailEl.innerHTML = `
        <div class="pw-detail__kicker"><span>${d.sec}</span>${ic("chev", "", 'data-size="sm"')}<span>Task ${t.n} of 5</span>${t.req ? reqTag("required") : reqTag("optional")}${t.stop ? stopTag() : ""}</div>
        <div class="pw-detail__title"><h3 class="t-title">${esc(t.title)}</h3><span class="grow"></span>${badge(t.done ? "done" : lk ? "todo" : "todo", { label: t.done ? "Done" : lk ? "Locked" : "To do" })}</div>
        <dl class="pw-detail__meta">
          <dt>Assignee</dt><dd>${t.assignee ? `${avatar(t.assignee)}<span>${t.assignee}</span>` : "Unassigned"}</dd>
          <dt>Due</dt><dd>${t.due ? due(t.due.kind, t.due.text, { hint: true }) : `<span class="t-muted">No due date</span>`}</dd>
        </dl>
        <p class="pw-detail__desc">${d.desc}</p>
        <div class="pw-detail__fields">${d.fields.map(field).join("")}</div>
        <div class="pw-detail__foot">
          <button type="button" class="ds-btn" data-variant="${t.done ? "secondary" : "primary"}" id="rp-do" ${lk && !t.done ? 'aria-disabled="true"' : ""}>${t.done ? "Reopen task" : "Mark as done"}<span class="pw-kbd">X</span></button>
          ${lk && !t.done ? `<span class="ds-alert">${ics("lock")}Locked until “${esc(lk.title)}” is done.</span>` : isNext ? `<span class="t-meta t-muted">Next required task</span>` : ""}
        </div>`;
    }
    list = createChecklist($("#rp-list"), {
      id: "rp", label: "Run checklist", sections: rpSections, selected: "t4", say: () => {},
      barrierText: (t) => `<b>Stop task</b> · unlocks below`,
      onSelect: (t) => paintDetail(t),
      onChange: (c) => {
        const first = !progEl.dataset.init; progEl.dataset.init = "1";
        setProgress(progEl, c.done, c.total, c.complete);
        bar.style.setProperty("--p", c.done / c.total); c.complete ? bar.setAttribute("data-state", "done") : bar.removeAttribute("data-state");
        setBadge(badgeEl, c.complete ? "completed" : "progress");
        $("#rp-req").textContent = c.complete ? "All required done" : `${c.requiredLeft} required left`;
        if (c.complete && !first && motionOK()) { const r = $(".pw-ring", progEl); r.removeAttribute("data-glow"); void r.offsetWidth; r.setAttribute("data-glow", ""); }
        const k = kvVars.find((v) => v.key === "key_tag"), t5 = list && list.byId.t5;
        if (t5) { const was = k.on; k.on = t5.done; if (was !== k.on) paintVars(k.on ? "key_tag" : null); }
        if (list && list.selected) paintDetail(list.selected);
      }
    });
    paintVars(); paintAI(); paintDetail(list.selected);
    detailEl.addEventListener("click", (e) => {
      const b = e.target.closest("#rp-do"); if (!b) return;
      list.toggle(list.selected.id, { keepSel: true });
    });
  })();

  /* last: the document is ready — fonts may shift widths, so re-place thumbs */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { themeSeg.place(false); motionSeg.place(false); });
})();
