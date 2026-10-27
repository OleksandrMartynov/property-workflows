// Тема «System / Light / Dark» (AC-DSYS-05…07): логіка вибору й сховища (src/lib/theme.ts), вбудований скрипт без
// спалаху, CSS-токени (src/app/globals.css) і контраст статусів у темній темі.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/ui/status-badge";
import { loadThemes, ratio } from "../../scripts/lib/contrast.mjs";
import {
  THEME_CHOICES,
  THEME_INIT_SCRIPT,
  THEME_KEY,
  THEME_LABELS,
  applyTheme,
  parseTheme,
  readStoredTheme,
  resolveTheme,
  themeAttribute,
  writeStoredTheme,
} from "@/lib/theme";

type Storage1 = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void };
const memoryStorage = (initial: Record<string, string> = {}): Storage1 & { data: Record<string, string> } => {
  const data = { ...initial };
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) };
};
const brokenStorage: Storage1 = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};
const fakeRoot = () => {
  const attrs: Record<string, string> = {};
  return { attrs, setAttribute: (name: string, value: string) => void (attrs[name] = value), removeAttribute: (name: string) => void delete attrs[name] };
};

describe("Тема за замовчуванням слідує за пристроєм", () => {
  it("AC-DSYS-05: без вибору теми показано «System», а темний пристрій дає темну тему", () => {
    const storage = memoryStorage();
    const choice = readStoredTheme(storage);
    expect(choice).toBe("system");
    expect(THEME_LABELS[choice]).toBe("System");
    expect(resolveTheme(choice, true)).toBe("dark");
    expect(resolveTheme(choice, false)).toBe("light");
  });

  it("AC-DSYS-05: «System» не ставить data-theme на <html>, тому діє вигляд пристрою (prefers-color-scheme)", () => {
    const root = fakeRoot();
    applyTheme(root, "system");
    expect(root.attrs["data-theme"]).toBeUndefined();
    expect(themeAttribute("system")).toBeNull();
  });

  it("AC-DSYS-05: невідоме чи зіпсоване збережене значення — теж «System»", () => {
    for (const raw of [null, undefined, "", "auto", "DARK", "{}", 1]) expect(parseTheme(raw)).toBe("system");
    expect(readStoredTheme(memoryStorage({ [THEME_KEY]: "blue" }))).toBe("system");
  });

  it("AC-DSYS-05: вибір має рівно три значення: System, Light, Dark", () => {
    expect(THEME_CHOICES.map((c) => THEME_LABELS[c])).toEqual(["System", "Light", "Dark"]);
  });
});

describe("Вибір теми зберігається на пристрої", () => {
  it("AC-DSYS-06: «Light» на темному пристрої дає світлу тему й показується в виборі «Theme»", () => {
    const storage = memoryStorage();
    expect(writeStoredTheme(storage, "light")).toBe(true);
    // «Закрив браузер і відкрив знову»: нове читання з того самого сховища пристрою.
    const after = readStoredTheme(storage);
    expect(after).toBe("light");
    expect(THEME_LABELS[after]).toBe("Light");
    expect(resolveTheme(after, true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("AC-DSYS-06: вибір лежить у сховищі пристрою під ключем pw.theme, а не в профілі користувача", () => {
    const storage = memoryStorage();
    writeStoredTheme(storage, "dark");
    expect(storage.data).toEqual({ "pw.theme": "dark" });
    const source = readFileSync(join(process.cwd(), "src", "lib", "theme.ts"), "utf8");
    expect(source).not.toMatch(/supabase|profiles/i);
  });

  it("AC-DSYS-06: «Light» і «Dark» ставлять data-theme на <html>, «System» його прибирає", () => {
    const root = fakeRoot();
    applyTheme(root, "light");
    expect(root.attrs["data-theme"]).toBe("light");
    applyTheme(root, "dark");
    expect(root.attrs["data-theme"]).toBe("dark");
    applyTheme(root, "system");
    expect(root.attrs["data-theme"]).toBeUndefined();
  });

  it("AC-DSYS-06: недоступне сховище (приватне вікно) не ламає читання й запис", () => {
    expect(readStoredTheme(brokenStorage)).toBe("system");
    expect(readStoredTheme(undefined)).toBe("system");
    expect(writeStoredTheme(brokenStorage, "dark")).toBe(false);
    expect(writeStoredTheme(undefined, "dark")).toBe(false);
  });

  it("AC-DSYS-06: вбудований скрипт у <head> ставить data-theme зі сховища до малювання (без спалаху), для всіх сторінок", () => {
    const run = (storage: Storage1) => {
      const root = fakeRoot();
      new Function("localStorage", "document", THEME_INIT_SCRIPT)(storage, { documentElement: root });
      return root.attrs["data-theme"];
    };
    expect(run(memoryStorage({ [THEME_KEY]: "light" }))).toBe("light");
    expect(run(memoryStorage({ [THEME_KEY]: "dark" }))).toBe("dark");
    expect(run(memoryStorage({ [THEME_KEY]: "system" }))).toBeUndefined();
    expect(run(memoryStorage())).toBeUndefined();
    expect(run(memoryStorage({ [THEME_KEY]: "<script>" }))).toBeUndefined();
    expect(run(brokenStorage)).toBeUndefined();
    // Скрипт стоїть у кореневому layout, а не в сторінці: тема однакова для входу й решти сторінок.
    const layout = readFileSync(join(process.cwd(), "src", "app", "layout.tsx"), "utf8");
    expect(layout).toContain("THEME_INIT_SCRIPT");
    expect(layout).toContain("suppressHydrationWarning");
  });

  it("AC-DSYS-06: вибір «Theme» є на сторінці входу й у вікні акаунта застосунку", () => {
    const login = readFileSync(join(process.cwd(), "src", "app", "login", "page.tsx"), "utf8");
    const shell = readFileSync(join(process.cwd(), "src", "components", "ui", "app-shell.tsx"), "utf8");
    expect(login).toContain("<ThemeSwitch");
    expect(shell).toContain("<ThemeSwitch");
  });
});

const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
type Tokens = Record<string, [number, number, number]>;
const loaded = loadThemes() as unknown as { themes: Record<"light" | "dark", Tokens>; darkMedia: Tokens; darkExplicit: Tokens; light: Tokens };
const { themes, darkMedia, darkExplicit, light } = loaded;
const hue = (token: string, theme: "light" | "dark") => themes[theme][token][2];
const contrast = (a: [number, number, number], b: [number, number, number]) => (ratio as (x: unknown, y: unknown) => number)(a, b);

describe("Токени темної теми в CSS", () => {
  it("AC-DSYS-05: темні токени діють за prefers-color-scheme, крім випадку, коли явно обрано «Light»", () => {
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\) \{/);
    expect(Object.keys(darkMedia).length).toBeGreaterThan(40);
  });

  it("AC-DSYS-06: «Dark» і «Light» діють незалежно від пристрою: явні правила для data-theme і color-scheme", () => {
    expect(css).toMatch(/:root\[data-theme="dark"\] \{/);
    expect(css).toMatch(/:root\[data-theme="light"\] \{\s*color-scheme: light;/);
    expect(css).toMatch(/:root\[data-theme="dark"\] \{\s*color-scheme: dark;/);
  });

  it("AC-DSYS-06: дві копії темних токенів (System на темному пристрої і явний Dark) не розійшлися", () => {
    expect(darkExplicit).toEqual(darkMedia);
  });
});

describe("Статуси в темній темі", () => {
  const PAIRS = [
    ["status-progress-foreground", "status-progress", "in progress"],
    ["status-done-foreground", "status-done", "completed"],
  ] as const;

  it("AC-DSYS-07: контраст тексту статусу «in progress» і «completed» на його тлі в темній темі ≥ 4.5 до 1", () => {
    for (const [fg, bg] of PAIRS) {
      expect(contrast(themes.dark[fg], themes.dark[bg]), `${fg} → ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("AC-DSYS-07: «in progress» лишається синім (відтінок ≈ 268), «completed» — зеленим (≈ 150), як у світлій темі", () => {
    for (const theme of ["light", "dark"] as const) {
      for (const token of ["status-progress", "status-progress-foreground", "status-progress-mark"]) {
        expect(Math.abs(hue(token, theme) - 268), `${token} (${theme})`).toBeLessThanOrEqual(5);
      }
      for (const token of ["status-done", "status-done-foreground", "status-done-mark"]) {
        expect(Math.abs(hue(token, theme) - 150), `${token} (${theme})`).toBeLessThanOrEqual(5);
      }
    }
    // Відтінок за значенням однаковий у світлій і темній темах.
    for (const token of ["status-progress", "status-done"]) expect(hue(token, "dark")).toBeCloseTo(light[token][2], 0);
  });

  it("AC-DSYS-07: слово статусу поруч із кольором: StatusBadge малює іконку й слово, тло й текст — токени статусу (які змінює тема)", () => {
    const progress = renderToStaticMarkup(<StatusBadge status="progress">in progress</StatusBadge>);
    const done = renderToStaticMarkup(<StatusBadge status="done">completed</StatusBadge>);
    expect(progress).toContain("in progress");
    expect(progress).toContain("bg-status-progress text-status-progress-foreground");
    expect(progress).toContain("<svg");
    expect(done).toContain("completed");
    expect(done).toContain("bg-status-done text-status-done-foreground");
    expect(done).toContain("<svg");
  });
});
