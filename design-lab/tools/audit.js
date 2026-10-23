(async () => {
  const probe = document.createElement("canvas"); probe.width = probe.height = 1;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  const rgba = (css) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = "#000"; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (f, b) => [0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3]));
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bgOf = (el) => { const layers = []; for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } } let base = [255, 255, 255]; for (const c of layers.reverse()) base = over(c, base); return base; };
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const sel = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.getAttribute("data-testid") ? "[" + el.getAttribute("data-testid") + "]" : "") + ":" + (el.textContent || "").trim().slice(0, 24);
  const out = { path: location.pathname, theme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" };

  // 1. Контраст тексту
  const low = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement; if (!el || seen.has(el) || !t.textContent.trim() || !vis(el) || el.closest(".sr-only") || el.closest("nextjs-portal")) continue;
    seen.add(el);
    const s = getComputedStyle(el); const fg = rgba(s.color); const bg = bgOf(el); const c = ratio(over(fg, bg), bg);
    const size = parseFloat(s.fontSize), bold = parseInt(s.fontWeight) >= 700; const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    if (c < need) low.push({ el: sel(el), ratio: +c.toFixed(2), need });
  }
  out.lowContrast = low.slice(0, 12);

  // 2. Підписи
  const unnamed = [];
  document.querySelectorAll("input:not([type=hidden]), select, textarea, button, a[href], [role=combobox], [role=spinbutton], [role=switch], [role=checkbox]").forEach((el) => {
    if (!vis(el) || el.closest("nextjs-portal")) return;
    const name = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || (el.labels && el.labels.length) || (el.textContent || "").trim() || el.getAttribute("title");
    if (!name) unnamed.push(sel(el) || el.outerHTML.slice(0, 80));
  });
  out.unnamed = unnamed.slice(0, 10);

  // 3. Видимий фокус
  const noFocus = [];
  const focusables = [...document.querySelectorAll("a[href], button:not(:disabled), input:not([type=hidden]):not(:disabled), select, textarea, [tabindex]:not([tabindex='-1'])")].filter((e) => vis(e) && !e.closest("nextjs-portal"));
  for (const el of focusables) {
    el.focus({ focusVisible: true });
    const s = getComputedStyle(el); const hasOutline = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0; const hasShadow = s.boxShadow && s.boxShadow !== "none";
    const wrapper = el.closest("[data-ctl-input], .dt-shell, label") ? getComputedStyle(el.closest("[data-ctl-input], .dt-shell, label")) : null;
    const wrapOk = wrapper && ((wrapper.outlineStyle !== "none" && parseFloat(wrapper.outlineWidth) > 0) || (wrapper.boxShadow && wrapper.boxShadow !== "none"));
    if (!hasOutline && !hasShadow && !wrapOk) noFocus.push(sel(el));
  }
  document.activeElement && document.activeElement.blur();
  out.focusables = focusables.length; out.noVisibleFocus = noFocus.slice(0, 10);

  // 4. Сирі кольори й обрізання
  const rawRe = /(^|\s)(?:bg|text|border|ring|fill|stroke)-(?:zinc|gray|slate|neutral|stone|red|green|blue|amber|white|black)(?:-\d+)?(?:\s|$)|\[#/;
  out.rawClasses = [...document.querySelectorAll("[class]")].filter((e) => rawRe.test(typeof e.className === "string" ? e.className : "")).slice(0, 8).map(sel);
  out.inlineColor = [...document.querySelectorAll("[style]")].filter((e) => /color|background|#[0-9a-f]{3,6}/i.test(e.getAttribute("style") || "") && !e.closest("nextjs-portal")).slice(0, 8).map(sel);
  out.truncated = [...document.querySelectorAll("*")].filter((e) => vis(e) && getComputedStyle(e).textOverflow === "ellipsis" && e.scrollWidth > e.clientWidth).slice(0, 8).map(sel);
  out.statusWithoutText = [...document.querySelectorAll("[data-status], [data-testid*=status]")].filter((e) => !(e.textContent || "").trim()).length;
  return JSON.stringify(out);
})()
