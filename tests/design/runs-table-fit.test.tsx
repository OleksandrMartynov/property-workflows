// Таблиця запусків уміщається в ширину без прокрутки вбік: колонки з'являються за шириною самої таблиці (container
// queries — поруч сайдбар, вікно 800 px дає таблиці ~480 px), схована колонка не губить даних — менеджер і статус
// переходять під назву випадку; довге слово без пробілів рветься, а не розпирає колонку.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunsList } from "@/app/(app)/runs/_components/runs-list";

const html = renderToStaticMarkup(
  <RunsList
    runs={[{ id: "r1", case_name: "Apartment 12, move-in", template_name: "Tenant move-in", status: "in_progress", run_manager_id: "m1" }]}
    summary={{ r1: { done: 1, total: 5, nextTask: "Inspect the apartment", assignees: ["manager.a@example.test"] } }}
    managerOf={() => "manager.a@example.test"}
  />,
);
const header = (name: string) => html.match(new RegExp(`<th[^>]*class="([^"]*)"[^>]*>${name}</th>`))?.[1] ?? "";

describe("Таблиця запусків: колонки за шириною таблиці", () => {
  it("обгортка таблиці — контейнер; колонки ховаються за її шириною, а не за шириною вікна", () => {
    expect(html).toMatch(/<div class="@container [^"]*overflow-x-auto/);
    expect(header("Status")).toContain("@md:table-cell");
    expect(header("Assignees")).toContain("@xl:table-cell");
    expect(header("Run manager")).toContain("@3xl:table-cell");
    expect(header("Next task")).toContain("@5xl:table-cell");
    // Жодної колонки за шириною вікна (md:table-cell без «@»).
    expect(html).not.toMatch(/[\s"]md:table-cell/);
    // Назва випадку й прогрес — завжди.
    expect(header("Run")).not.toContain("hidden");
    expect(header("Progress")).not.toContain("hidden");
  });

  it("AC-DSYS-01: на вузькій таблиці статус (іконка й слово) — під назвою випадку, як і email менеджера; прогрес «N of M done»", () => {
    const cell = html.match(/<td[^>]*>[\s\S]*?<\/td>/)?.[0] ?? "";
    expect(cell).toMatch(/class="[^"]*@3xl:hidden[^"]*">manager\.a@example\.test</);
    expect(cell).toMatch(/class="mt-1 @md:hidden">[\s\S]*in progress/);
    expect(cell).toContain("wrap-anywhere");
    expect(html).toContain("1 of 5 done");
  });
});
