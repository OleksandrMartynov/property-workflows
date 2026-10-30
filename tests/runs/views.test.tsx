// Вигляди й пошук списку запусків (docs/ux/ux-plan.md, партія 3). Порожній стан без фільтрів — дослівно AC-DSYS-04;
// звужений список без результатів — «No runs found.» без «Launch a template».
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunsList } from "@/app/(app)/runs/_components/runs-list";
import { RunsPager } from "@/app/(app)/runs/_components/runs-pager";
import { ilikePattern, isFiltered, parseRunQuery, parseRunView, RUN_VIEWS } from "@/lib/runs/views";

describe("Вигляди списку запусків", () => {
  it("вигляди — All, Mine, In progress, Completed; невідомий чи відсутній — All", () => {
    expect(RUN_VIEWS.map((v) => v.label)).toEqual(["All", "Mine", "In progress", "Completed"]);
    expect(parseRunView("mine")).toBe("mine");
    expect(parseRunView("completed")).toBe("completed");
    expect(parseRunView("everything")).toBe("all");
    expect(parseRunView(undefined)).toBe("all");
    expect(parseRunView(["mine"])).toBe("all");
  });

  it("пошук обрізає пробіли й довжину до 100 символів; «%» і «_» — буквальні символи", () => {
    expect(parseRunQuery("  Apartment 12  ")).toBe("Apartment 12");
    expect(parseRunQuery("x".repeat(150))).toHaveLength(100);
    expect(parseRunQuery(undefined)).toBe("");
    expect(ilikePattern("12")).toBe("%12%");
    expect(ilikePattern("50%_off")).toBe("%50\\%\\_off%");
  });

  it("звуженим вважається будь-який вигляд, крім All, або непорожній пошук", () => {
    expect(isFiltered("all", "")).toBe(false);
    expect(isFiltered("mine", "")).toBe(true);
    expect(isFiltered("all", "Apartment")).toBe(true);
  });
});

describe("Порожній список запусків", () => {
  it("AC-DSYS-04: без фільтрів — «No runs yet. Launch a template to start one.» і «Launch a template», без таблиці", () => {
    const html = renderToStaticMarkup(<RunsList runs={[]} summary={{}} managerOf={() => "me"} />);
    expect(html).toContain("No runs yet. Launch a template to start one.");
    expect(html).toMatch(/<a [^>]*href="\/templates"[^>]*>Launch a template<\/a>/);
    expect(html).not.toContain("<table");
  });

  it("звужений список без результатів — «No runs found.», без «Launch a template» і без таблиці", () => {
    const html = renderToStaticMarkup(<RunsList runs={[]} summary={{}} managerOf={() => "me"} filtered />);
    expect(html).toContain("No runs found.");
    expect(html).not.toContain("Launch a template");
    expect(html).not.toContain("<table");
  });
});

describe("Сторінки списку запусків", () => {
  it("посилання «Older» / «Newer» зберігають вигляд і пошук", () => {
    const html = renderToStaticMarkup(<RunsPager page={2} total={120} pageSize={50} params={{ view: "mine", q: "Apartment" }} />);
    expect(html).toContain('href="/runs?view=mine&amp;q=Apartment&amp;page=1"');
    expect(html).toContain('href="/runs?view=mine&amp;q=Apartment&amp;page=3"');
    expect(html).toContain("Page 2 of 3");
  });

  it("одна сторінка — без навігації", () => {
    expect(renderToStaticMarkup(<RunsPager page={1} total={10} pageSize={50} params={{}} />)).toBe("");
  });
});

describe("Адреса рядка фільтрів", () => {
  it("будує адресу з чернеток вигляду й пошуку, скидає сторінку й лишає інші параметри", async () => {
    const { filterHref } = await import("@/components/ui/filter-bar");
    expect(filterHref("/runs", "view=mine&q=old&page=3&x=1", { view: "completed", q: "Apartment" }, "all")).toBe("/runs?x=1&view=completed&q=Apartment");
    expect(filterHref("/runs", "view=mine&page=2", { view: "all", q: "" }, "all")).toBe("/runs");
  });
});
