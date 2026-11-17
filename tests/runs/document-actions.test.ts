// Дії блоку «Parse a document» (зріз 4, solomchaak/property-workflows-spec#59): requestDocumentDraft перевіряє права
// (check_run_document) ДО виклику моделі й нічого не пише; saveRunDocument перевіряє форму кодом і пише лише через
// save_run_document. Заглушки — лише зовнішнє: клієнт Supabase, провайдер OpenRouter (повертає тестову модель),
// `server-only` і revalidatePath; фабрика productModel — справжня, ключ задає vi.stubEnv. Відповіді моделі — записи
// golden cases PM (тексти AC-DOCAI збігаються з GC-01, 04, 05, 07, 08, 09, 10).
import { APICallError, type LanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ASSISTANT_UNAVAILABLE } from "@/lib/ai/draft";
import { INSTRUCTIONS_NOTE, REFUSED_MESSAGE, TWO_PROBLEMS_NOTE } from "@/lib/ai/rules";
import { MESSAGES } from "@/lib/runs/messages";
import recordedJson from "../fixtures/golden/recorded.json";

const recorded = recordedJson as Record<string, { text: string }>;
const rpc = vi.fn();
const from = vi.fn();
const revalidated: string[] = [];
let model: LanguageModel;

vi.mock("@/lib/supabase/viewer", () => ({
  requireViewer: async () => ({ supabase: { rpc, from }, viewer: { id: "a", role: "manager", email: "manager.a@example.test" } }),
}));
vi.mock("server-only", () => ({}));
vi.mock("@openrouter/ai-sdk-provider", () => ({ createOpenRouter: () => ({ chat: () => model }) }));
vi.mock("next/cache", () => ({ revalidatePath: (path: string) => revalidated.push(path) }));

const { requestDocumentDraft, saveRunDocument } = await import("@/app/(app)/runs/[id]/document-actions");

const RUN = "11111111-1111-1111-1111-111111111111";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};
const answering = (text: string) =>
  new MockLanguageModelV4({
    doGenerate: async () => ({ content: [{ type: "text", text }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] }),
  });

const requestForm = (text: string) => {
  const fd = new FormData();
  fd.set("run_id", RUN);
  fd.set("text", text);
  return fd;
};

const saveForm = (values: Record<string, string>) => {
  const fd = new FormData();
  fd.set("run_id", RUN);
  for (const [key, value] of Object.entries(values)) fd.set(key, value);
  return fd;
};

/** Пропозиція для тексту AC з записаною відповіддю golden case. */
async function propose(caseId: string, text = "document text") {
  model = answering(recorded[caseId].text);
  return requestDocumentDraft(null, requestForm(text));
}

beforeEach(() => {
  rpc.mockReset();
  from.mockReset();
  revalidated.length = 0;
  rpc.mockResolvedValue({ data: true, error: null });
  vi.stubEnv("OPENROUTER_API_KEY", "test-key-not-real");
});
afterEach(() => vi.unstubAllEnvs());

describe("requestDocumentDraft: AI пропонує, нічого не збережено", () => {
  it("AC-DOCAI-01: запит про кран — «Maintenance request», 555-0101, «plumbing», «not urgent», у базу нічого не пише", async () => {
    const state = await propose("GC-01");
    expect(state).toMatchObject({
      status: "draft",
      draft: { status: "ok", kind: "request", phone: "555-0101", category: "plumbing", urgency: "not_urgent", notes: [] },
      notice: null,
    });
    // Єдиний виклик бази — перевірка прав менеджера запуску; жодного save_run_document і жодного запису в таблиці.
    expect(rpc.mock.calls).toEqual([["check_run_document", { p_run_id: RUN }]]);
    expect(from).not.toHaveBeenCalled();
  });

  it("AC-DOCAI-02: кошторис — три позиції й Total 220.00 без попередження", async () => {
    const state = await propose("GC-07");
    expect(state).toMatchObject({
      status: "draft",
      draft: {
        kind: "estimate",
        items: [
          { name: "Replace kitchen tap", quantity: 1, unitPrice: 85 },
          { name: "Labour", quantity: 2, unitPrice: 60 },
          { name: "Disposal fee", quantity: 1, unitPrice: 15 },
        ],
        total: 220,
        notes: [],
      },
    });
  });

  it("AC-DOCAI-06: немає телефону — Phone порожній (позначка «not found» у полі), «appliance», «not urgent»", async () => {
    expect(await propose("GC-04")).toMatchObject({ status: "draft", draft: { phone: null, category: "appliance", urgency: "not_urgent" } });
  });

  it("AC-DOCAI-07: дві проблеми — 555-0104, «plumbing», «not urgent» і примітка «the email has two problems»", async () => {
    const state = await propose("GC-05");
    expect(state).toMatchObject({ status: "draft", draft: { phone: "555-0104", category: "plumbing", urgency: "not_urgent" } });
    expect(state?.status === "draft" && state.draft.notes).toEqual([TWO_PROBLEMS_NOTE]);
  });

  it("AC-DOCAI-08: Total 200.00 як написано й попередження «items add up to 220.00, the stated total is 200.00»", async () => {
    const state = await propose("GC-08");
    expect(state).toMatchObject({ status: "draft", draft: { total: 200 } });
    expect(state?.status === "draft" && state.draft.notes).toContain("items add up to 220.00, the stated total is 200.00");
  });

  it("AC-DOCAI-09: меню — «This document is not a maintenance request or an estimate.» і жодного значення", async () => {
    expect(await propose("GC-09")).toEqual({ status: "error", message: REFUSED_MESSAGE });
    expect(REFUSED_MESSAGE).toBe("This document is not a maintenance request or an estimate.");
  });

  it("AC-DOCAI-10: інструкції в тексті не виконано — «not urgent», 555-0106 і примітка про проігноровані інструкції", async () => {
    const state = await propose("GC-10");
    expect(state).toMatchObject({ status: "draft", draft: { phone: "555-0106", category: "heating_and_cooling", urgency: "not_urgent" } });
    expect(state?.status === "draft" && state.draft.notes).toEqual([INSTRUCTIONS_NOTE]);
  });

  it("AC-DOCAI-11: порожній текст або лише пробіли — «Paste the text of a document», модель не викликано", async () => {
    const spy = answering(recorded["GC-01"].text);
    model = spy;
    for (const text of ["", "   \n "]) {
      expect(await requestDocumentDraft(null, requestForm(text))).toEqual({ status: "error", message: "Paste the text of a document" });
    }
    expect(spy.doGenerateCalls).toHaveLength(0);
  });

  it("текст довший за межу — повідомлення про межу, а не мовчазне обрізання", async () => {
    expect(await requestDocumentDraft(null, requestForm("x".repeat(8_001)))).toEqual({ status: "error", message: MESSAGES.DOCUMENT_TOO_LONG });
  });

  it("AC-DOCAI-13: немає ключа — «The assistant is not available now. Fill in the values yourself.», поля для ручного введення", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    expect(await requestDocumentDraft(null, requestForm("The oven does not heat."))).toEqual({ status: "unavailable", message: ASSISTANT_UNAVAILABLE });
    expect(ASSISTANT_UNAVAILABLE).toBe("The assistant is not available now. Fill in the values yourself.");
  });

  it("AC-DOCAI-13: ліміт безкоштовних моделей (429) — той самий стан «недоступний»", async () => {
    model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new APICallError({ message: "Rate limit", url: "https://openrouter.ai", requestBodyValues: {}, statusCode: 429, isRetryable: false });
      },
    });
    expect(await requestDocumentDraft(null, requestForm("The oven does not heat."))).toEqual({ status: "unavailable", message: ASSISTANT_UNAVAILABLE });
  });

  it("AC-DOCAI-16: не менеджер запуску й не адміністратор — «Not enough rights», модель не викликано (ліміт не витрачено)", async () => {
    const spy = answering(recorded["GC-01"].text);
    model = spy;
    rpc.mockResolvedValue({ data: null, error: { message: "DOCUMENT_NOT_ALLOWED" } });
    expect(await requestDocumentDraft(null, requestForm("Some text"))).toEqual({ status: "error", message: "Not enough rights" });
    expect(spy.doGenerateCalls).toHaveLength(0);
  });
});

describe("saveRunDocument: лише те, що підтвердила людина", () => {
  it("AC-DOCAI-04: Urgency змінено на «urgent» — save_run_document з підтвердженими значеннями, сторінку оновлено", async () => {
    const state = await saveRunDocument(null, saveForm({ kind: "request", phone: "555-0101", category: "plumbing", urgency: "urgent", description: "Kitchen tap drips." }));
    expect(state).toEqual({ status: "saved" });
    expect(rpc.mock.calls).toEqual([
      ["check_run_document", { p_run_id: RUN }],
      [
        "save_run_document",
        {
          p_run_id: RUN,
          p_kind: "request",
          p_phone: "555-0101",
          p_description: "Kitchen tap drips.",
          p_category: "plumbing",
          p_urgency: "urgent",
          p_items: null,
          p_total: null,
        },
      ],
    ]);
    expect(revalidated).toEqual([`/runs/${RUN}`]);
  });

  it("AC-DOCAI-13: значення, введені вручну без AI, зберігаються так само", async () => {
    expect(await saveRunDocument(null, saveForm({ kind: "estimate", items: JSON.stringify([{ name: "Labour", quantity: 1, unitPrice: 60 }]), total: "60" }))).toEqual({
      status: "saved",
    });
  });

  it("AC-DOCAI-16: прямий запит без права — «Not enough rights», save_run_document не викликано", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "DOCUMENT_NOT_ALLOWED" } });
    expect(await saveRunDocument(null, saveForm({ kind: "request", phone: "555-0101" }))).toEqual({ status: "error", message: "Not enough rights" });
    expect(rpc.mock.calls.map(([fn]) => fn)).toEqual(["check_run_document"]);
    expect(revalidated).toEqual([]);
  });

  it("неправильний телефон чи порожня форма — повідомлення, у базу нічого не пише", async () => {
    expect(await saveRunDocument(null, saveForm({ kind: "request", phone: "12" }))).toEqual({ status: "error", message: MESSAGES.PHONE_INVALID });
    expect(await saveRunDocument(null, saveForm({ kind: "request" }))).toEqual({ status: "error", message: MESSAGES.DOCUMENT_EMPTY });
    expect(rpc.mock.calls.map(([fn]) => fn)).toEqual(["check_run_document", "check_run_document"]);
  });

  it("некоректний id запуску — «Run not found» без жодного запиту", async () => {
    const fd = saveForm({ kind: "request", phone: "555-0101" });
    fd.set("run_id", "not-a-run");
    expect(await saveRunDocument(null, fd)).toEqual({ status: "error", message: MESSAGES.RUN_NOT_FOUND });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("журнал llm.call (WS11): один рядок на виклик моделі, без тексту документа", () => {
  const MARKER = "MARKER-5f2c Lena Test lena.private@example.test 555-0199";
  const lines = () => {
    const calls = [...vi.mocked(console.info).mock.calls, ...vi.mocked(console.error).mock.calls].map(([line]) => String(line));
    return calls.filter((line) => line.includes('"llm.call"'));
  };

  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("AC-DOCAI-01: пропозиція — рядок зі станом ok, моделлю, версією промпту й токенами; маркера з документа немає", async () => {
    await propose("GC-01", `Kitchen tap drips. ${MARKER}`);
    const [line, ...rest] = lines();
    expect(rest).toEqual([]);
    const entry = JSON.parse(line);
    expect(entry).toMatchObject({ event: "llm.call", route: "/runs/[id]", state: "ok", fallbackUsed: expect.any(Boolean), promptVersion: expect.any(String) });
    expect(typeof entry.latencyMs).toBe("number");
    expect(line).not.toContain("MARKER-5f2c");
    expect(line).not.toContain("Kitchen tap");
    expect(line).not.toContain("lena.private");
    expect(Object.keys(entry).sort()).toEqual(
      expect.arrayContaining(["event", "ts", "requestId", "route", "model", "fallbackUsed", "state", "latencyMs", "promptVersion"]),
    );
  });

  it("AC-DOCAI-13: без ключа модель не викликана — рядок unavailable рівнем error з кодом no_key, без тексту", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    await requestDocumentDraft(null, requestForm(`The oven does not heat. ${MARKER}`));
    const [line] = lines();
    expect(JSON.parse(line)).toMatchObject({ event: "llm.call", state: "unavailable", errorKind: "no_key" });
    expect(vi.mocked(console.error)).toHaveBeenCalledTimes(1);
    expect(line).not.toContain("MARKER-5f2c");
  });

  it("AC-DOCAI-16: без права модель не викликана — і журнал llm.call порожній", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "DOCUMENT_NOT_ALLOWED" } });
    await requestDocumentDraft(null, requestForm(MARKER));
    expect(lines()).toEqual([]);
  });
});
