// Єдина дизайн-система (вимога solomchaak/property-workflows-spec#19): статуси й порожній стан однакові на сторінках.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunsList } from "@/app/(app)/runs/_components/runs-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { NO_RUNS_ACTION, NO_RUNS_TITLE, runStatusLabel, runStatusTone } from "@/lib/runs/labels";

const badge = (status: string) =>
  renderToStaticMarkup(<StatusBadge status={runStatusTone(status)}>{runStatusLabel(status)}</StatusBadge>);

describe("Статуси запуску", () => {
  it("AC-DSYS-01: «in progress» — синій, «completed» — зелений, слово статусу поруч із кольором", () => {
    const inProgress = badge("in_progress");
    expect(inProgress).toContain("bg-status-progress");
    expect(inProgress).toContain(">in progress<");
    const completed = badge("completed");
    expect(completed).toContain("bg-status-done");
    expect(completed).toContain(">completed<");
    // Не лише колір: значок статусу й слово в тому самому елементі.
    expect(completed).toContain("<svg");
  });

  it("AC-DSYS-01: той самий статус — той самий тон на будь-якій сторінці (одна функція для списку й сторінки запуску)", () => {
    expect(runStatusTone("in_progress")).toBe("progress");
    expect(runStatusTone("completed")).toBe("done");
  });
});

describe("Порожній список запусків", () => {
  it("AC-DSYS-04: менеджер без запусків — «No runs yet. Launch a template to start one.» і «Launch a template», без таблиці", () => {
    const html = renderToStaticMarkup(<RunsList runs={[]} summary={{}} managerOf={() => "me"} />);
    expect(NO_RUNS_TITLE).toBe("No runs yet. Launch a template to start one.");
    expect(html).toContain(NO_RUNS_TITLE);
    expect(html).toContain(`href="/templates"`);
    expect(html).toContain(`>${NO_RUNS_ACTION}<`);
    expect(html).not.toContain("<table");
  });
});
