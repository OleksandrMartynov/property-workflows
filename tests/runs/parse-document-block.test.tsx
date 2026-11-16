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

describe("Стан читання й поля пропозиції", () => {
  it("AC-DOCAI-03: поки AI читає — «Reading the document…», «Propose values» вимкнена, значень не показано", async () => {
    const { ProposeControls, showsValues } = await import("@/app/(app)/runs/[id]/_components/parse-document-block");
    const html = renderToStaticMarkup(<ProposeControls reading onUpload={() => {}} />);
    expect(html).toContain("Reading the document…");
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""[^>]*>[\s\S]*?Propose values/);
    expect(showsValues({ mode: "manual", seq: 1 }, true)).toBe(false);
    expect(showsValues({ mode: "manual", seq: 1 }, false)).toBe(true);
    expect(renderToStaticMarkup(<ProposeControls reading={false} onUpload={() => {}} />)).not.toContain("Reading the document…");
  });

  it("AC-DOCAI-01, AC-DOCAI-06: поля пропозиції — «Maintenance request», 555-0101, «plumbing», «not urgent»; відсутнє — «not found»", async () => {
    const { ValueFields } = await import("@/app/(app)/runs/[id]/_components/document-fields");
    const draft = {
      status: "ok" as const,
      kind: "request" as const,
      phone: null,
      description: "The kitchen tap in apartment 12 has been dripping for three days.",
      category: "plumbing" as const,
      urgency: "not_urgent" as const,
      items: null,
      total: null,
      notes: [],
    };
    const html = renderToStaticMarkup(<ValueFields id="v" draft={draft} />);
    for (const text of ["Document type", "Maintenance request", "plumbing", "not urgent", "dripping for three days"]) expect(html).toContain(text);
    // Phone порожній і позначений «not found» (AC-DOCAI-06).
    expect(html).toMatch(/<input[^>]*name="phone"[^>]*placeholder="not found"|<input[^>]*placeholder="not found"[^>]*name="phone"/);
    expect(renderToStaticMarkup(<ValueFields id="v" draft={{ ...draft, phone: "555-0101" }} />)).toContain('value="555-0101"');
  });

  it("AC-DOCAI-13: без пропозиції — тип документа й значення порожні й доступні для введення", async () => {
    const { ValueFields } = await import("@/app/(app)/runs/[id]/_components/document-fields");
    const html = renderToStaticMarkup(<ValueFields id="m" draft={null} />);
    expect(html).toContain("Document type");
    expect(html).not.toContain("not found");
    expect(html).toMatch(/<input[^>]*name="phone"[^>]*value=""/);
    expect(html).not.toMatch(/readonly|disabled=""/);
  });
});

describe("Стан блоку після відповіді дії", () => {
  const draft = { status: "ok" as const, kind: "request" as const, phone: "555-0101", description: "Tap drips.", category: "plumbing" as const, urgency: "not_urgent" as const, items: null, total: null, notes: [] };

  it("AC-DOCAI-01: пропозиція — значення на перевірку, без повідомлення", async () => {
    const { afterProposal } = await import("@/app/(app)/runs/[id]/_components/parse-document-block");
    expect(afterProposal({ status: "draft", draft, notice: null }, 2)).toEqual({ values: { mode: "proposal", draft, notice: null, seq: 2 }, message: null });
    expect(afterProposal({ status: "draft", draft, notice: "Fill in" }, 3).message).toEqual({ text: "Fill in", tone: "info" });
  });

  it("AC-DOCAI-13: помічник недоступний — порожні поля для ручного введення й повідомлення PM", async () => {
    const { afterProposal } = await import("@/app/(app)/runs/[id]/_components/parse-document-block");
    const message = "The assistant is not available now. Fill in the values yourself.";
    expect(afterProposal({ status: "unavailable", message }, 1)).toEqual({ values: { mode: "manual", seq: 1 }, message: { text: message, tone: "info" } });
  });

  it("AC-DOCAI-09: відмова — лише повідомлення, жодного значення; немає відповіді — нічого", async () => {
    const { afterProposal } = await import("@/app/(app)/runs/[id]/_components/parse-document-block");
    const text = "This document is not a maintenance request or an estimate.";
    expect(afterProposal({ status: "error", message: text }, 4)).toEqual({ values: null, message: { text, tone: "error" } });
    expect(afterProposal(null, 5)).toEqual({ values: null, message: null });
  });

  it("AC-DOCAI-04: збережено — помилки немає (блок очищається); відмова — текст біля форми", async () => {
    const { saveErrorOf } = await import("@/app/(app)/runs/[id]/_components/parse-document-block");
    expect(saveErrorOf({ status: "saved" })).toBeNull();
    expect(saveErrorOf({ status: "error", message: "Not enough rights" })).toBe("Not enough rights");
    expect(saveErrorOf(null)).toBeNull();
  });
});

describe("Записи документів запуску з бази", () => {
  const client = (result: { data: unknown; error: { message: string } | null }, calls: unknown[][]) => {
    const chain: Record<string, unknown> = {};
    for (const m of ["select", "eq", "order"]) {
      chain[m] = (...args: unknown[]) => {
        calls.push([m, ...args]);
        return chain;
      };
    }
    chain.then = (resolve: (r: unknown) => unknown) => resolve(result);
    return { from: (table: string) => (calls.push(["from", table]), chain) } as never;
  };

  it("AC-DOCAI-04: записи запуску — новіший першим; помилка бази — помилка сторінки", async () => {
    const { loadRunDocuments } = await import("@/app/(app)/runs/[id]/_lib/documents");
    const calls: unknown[][] = [];
    expect(await loadRunDocuments(client({ data: [{ id: "d1" }], error: null }, calls), "r1")).toEqual([{ id: "d1" }]);
    expect(calls).toContainEqual(["from", "run_documents"]);
    expect(calls).toContainEqual(["eq", "run_id", "r1"]);
    expect(calls).toContainEqual(["order", "saved_at", { ascending: false }]);
    expect(await loadRunDocuments(client({ data: null, error: null }, []), "r1")).toEqual([]);
    await expect(loadRunDocuments(client({ data: null, error: { message: "connection reset" } }, []), "r1")).rejects.toThrow("connection reset");
  });
});

describe("Форма значень", () => {
  const draft = {
    status: "ok" as const,
    kind: "request" as const,
    phone: "555-0104",
    description: "Loud bathroom fan and a blocked kitchen sink.",
    category: "plumbing" as const,
    urgency: "not_urgent" as const,
    items: null,
    total: null,
    notes: ["the email has two problems", "items add up to 220.00, the stated total is 200.00"],
  };

  it("AC-DOCAI-05, AC-DOCAI-07: «Discard» і «Save values»; примітка «the email has two problems» видна, попередження суми — у полях", async () => {
    const { ValuesForm } = await import("@/app/(app)/runs/[id]/_components/parse-document-block");
    const html = renderToStaticMarkup(
      <ValuesForm id="v" runId="r1" values={{ mode: "proposal", draft, notice: null, seq: 1 }} saving={false} saveError={null} onSave={() => {}} onDiscard={() => {}} />,
    );
    expect(html).toContain(">Discard<");
    expect(html).toContain("Save values");
    expect(html).toContain("AI proposal");
    expect(html).toMatch(/data-testid="document-notes"[\s\S]*the email has two problems/);
    expect(html).not.toMatch(/data-testid="document-notes"[\s\S]*items add up to/);
  });

  it("AC-DOCAI-13: ручне введення — без позначки «AI proposal», помилка збереження біля форми", async () => {
    const { ValuesForm } = await import("@/app/(app)/runs/[id]/_components/parse-document-block");
    const html = renderToStaticMarkup(
      <ValuesForm id="m" runId="r1" values={{ mode: "manual", seq: 1 }} saving={false} saveError="Enter at least one value" onSave={() => {}} onDiscard={() => {}} />,
    );
    expect(html).not.toContain("AI proposal");
    expect(html).toContain("Enter at least one value");
  });
});
