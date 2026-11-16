// Блок «Parse a document» на сторінці запуску (зріз 4, solomchaak/property-workflows-spec#59): хто його бачить
// (AC-DOCAI-14, 15), що в ньому до пропозиції (AC-DOCAI-01: текст, «Upload a text file», «Propose values») і як
// показано збережені записи (AC-DOCAI-04, 05). Справжні компоненти, рендер без DOM; дії — заглушки.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunDetail } from "@/app/(app)/runs/[id]/_components/run-detail";
import { isPlainTextFile } from "@/app/(app)/runs/[id]/_components/parse-document-block";
import { VendorRunDetail } from "@/app/(app)/runs/[id]/_components/vendor-run-detail";
import { canParseDocuments } from "@/lib/runs/access";

const A = "a0000000-0000-0000-0000-000000000002";
const B = "a0000000-0000-0000-0000-000000000003";
const ADMIN = "a0000000-0000-0000-0000-000000000001";
const V = "a0000000-0000-0000-0000-000000000008";
const run = { id: "r1", case_name: "Apartment 12, move-in", template_name: "Tenant move-in", template_version: 1, status: "in_progress", run_manager_id: A };
const task = (id: string, assignee: string) => ({
  id,
  section_name: "Move-in day",
  section_position: 1,
  position: Number(id.slice(1)),
  name: `Task ${id}`,
  required: true,
  assignee_id: assignee,
  status: "to_do",
});
const tasks = [task("t1", A), task("t2", B), task("t3", V), task("t4", V)];
const emailOf = new Map([
  [A, "manager.a@example.test"],
  [B, "manager.b@example.test"],
]);
const actions = { requestDraft: async () => null, save: async () => null };
const record = (id: string, savedAt: string, urgency: string) => ({
  id,
  kind: "request",
  phone: "555-0101",
  description: null,
  category: "plumbing",
  urgency,
  items: null,
  total: null,
  saved_by: A,
  saved_at: savedAt,
});

describe("Хто бачить блок «Parse a document»", () => {
  it("AC-DOCAI-14: підрядник V, виконавець задач 3 і 4, не бачить блоку", () => {
    expect(canParseDocuments({ id: V, role: "vendor" }, run)).toBe(false);
    const html = renderToStaticMarkup(
      <VendorRunDetail run={run} tasks={[task("t3", V), task("t4", V)]} lastRequiredTaskId={null} viewer={{ id: V, role: "vendor", email: "vendor.v@example.test" }} completeTask={async () => {}} />,
    );
    expect(html).not.toContain("Parse a document");
  });

  it("AC-DOCAI-15: менеджер B, виконавець задачі в запуску менеджера A, не бачить блоку", () => {
    expect(canParseDocuments({ id: B, role: "manager" }, run)).toBe(false);
    const html = renderToStaticMarkup(
      <RunDetail run={run} tasks={tasks} emailOf={emailOf} viewer={{ id: B, role: "manager", email: "manager.b@example.test" }} completeTask={async () => {}} />,
    );
    expect(html).not.toContain("Parse a document");
    expect(html).not.toContain('data-testid="parse-document"');
  });

  it("менеджер запуску A й адміністратор бачать блок", () => {
    expect(canParseDocuments({ id: A, role: "manager" }, run)).toBe(true);
    expect(canParseDocuments({ id: ADMIN, role: "admin" }, run)).toBe(true);
  });
});

describe("Блок на сторінці менеджера запуску", () => {
  const render = (rows: ReturnType<typeof record>[] = []) =>
    renderToStaticMarkup(
      <RunDetail
        run={run}
        tasks={tasks}
        emailOf={emailOf}
        viewer={{ id: A, role: "manager", email: "manager.a@example.test" }}
        completeTask={async () => {}}
        documents={{ actions, rows }}
      />,
    );

  it("AC-DOCAI-01: поле тексту, «Upload a text file» і «Propose values»; значень ще немає", () => {
    const html = render();
    expect(html).toContain("Parse a document");
    expect(html).toMatch(/<textarea[^>]*name="text"/);
    expect(html).toContain(">Upload a text file<");
    expect(html).toContain("Propose values");
    expect(html).not.toContain("Save values");
  });

  it("AC-DOCAI-05: записів немає — сторінка не показує жодного збереженого запису", () => {
    const html = render();
    expect(html).not.toContain('data-testid="saved-document"');
    expect(html).not.toContain("Saved documents");
  });

  it("AC-DOCAI-04: запис — тип, значення, email того, хто підтвердив, дата й час за Києвом; новіший — першим", () => {
    const html = render([record("d2", "2026-11-12T08:15:00Z", "urgent"), record("d1", "2026-11-11T08:00:00Z", "not_urgent")]);
    const records = [...html.matchAll(/<li data-testid="saved-document">[\s\S]*?<\/li>/g)].map((m) => m[0]);
    expect(records).toHaveLength(2);
    const [newest] = records;
    for (const text of ["Maintenance request", "555-0101", "plumbing", "urgent", "manager.a@example.test", "12 Nov 2026, 10:15"]) {
      expect(newest).toContain(text);
    }
    expect(records[1]).toContain("not urgent");
  });
});

describe("Файл документа", () => {
  it("AC-DOCAI-12: «photo.png» — не текст; .txt — так", () => {
    expect(isPlainTextFile({ name: "photo.png", type: "image/png" })).toBe(false);
    expect(isPlainTextFile({ name: "notes.pdf", type: "application/pdf" })).toBe(false);
    expect(isPlainTextFile({ name: "request.txt", type: "text/plain" })).toBe(true);
    expect(isPlainTextFile({ name: "request.TXT", type: "" })).toBe(true);
  });
});
