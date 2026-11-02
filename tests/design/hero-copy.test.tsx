// Сторінка входу показує відвідувачу демо-картку чекліста (hero). Її назви вигадані: жодна не збігається з назвою
// шаблону, секції чи задачі з початкових даних бази, інакше відвідувач без входу «бачить вміст шаблону».
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroStage } from "@/components/ui/hero-stage";

// Назви з insert-ів початкових даних: шаблони, секції й задачі «Tenant move-in» і «Apartment repair».
const seed = readFileSync(new URL("../../supabase/migrations/20261019174350_run_launch.sql", import.meta.url), "utf8");
const seedNames = [...seed.matchAll(/\('[0-9a-f-]{36}',\s*(?:'[0-9a-f-]{36}',\s*)?'([^']+)'/g)].map((m) => m[1]);

describe("Hero сторінки входу", () => {
  it("AC-EDITOR-09: демо-картка не показує назв шаблонів, секцій і задач з бази", () => {
    expect(seedNames).toEqual(expect.arrayContaining(["Tenant move-in", "Apartment repair", "Before move-in", "Sign the lease agreement", "Hand over the keys"]));
    const html = renderToStaticMarkup(<HeroStage />).toLowerCase();
    for (const name of seedNames) expect(html).not.toContain(name.toLowerCase());
  });
});
