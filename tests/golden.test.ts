import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { proposeDraft, type DraftResult } from "@/lib/ai/draft";
import { DRAFT_PROMPT_VERSION } from "@/lib/ai/prompts/draft";
import { scoreFields, type GoldenCase } from "@/lib/ai/scorer";
import casesJson from "./fixtures/golden/cases.json";
import recordedJson from "./fixtures/golden/recorded.json";

// Офлайн-реплей golden cases: без мережі й без ключа, тож працює в CI (`npm test`, job `app`).
// Перевіряє КОД навколо моделі (промпт, межа <document>, схема, мапінг помилок, оцінювач), а НЕ якість моделі —
// якість міряє живий прогін `npm run eval` (evals/golden.live.eval.ts).

type Recording = { modelId: string; recordedAt: string; promptVersion?: string; text: string };
const cases = casesJson as GoldenCase[];
const recorded = recordedJson as Record<string, Recording>;

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

/** Пропозиція з успішної відповіді; не успіх — помилка тесту з причиною (без умов усередині тесту). */
function okDraft(result: DraftResult) {
  if (!result.ok) throw new Error(`очікували пропозицію, а отримали ${result.reason}: ${result.message}`);
  return result.draft;
}

// Модель, що «відповідає» записаним текстом.
function replay(text: string, modelId = "recorded") {
  return new MockLanguageModelV4({
    modelId,
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage,
      warnings: [],
    }),
  });
}

// 10 кейсів PM — solomchaak/property-workflows-spec#40 («Golden cases: AI document parsing»). Кожен кейс — під AC
// вимоги solomchaak/property-workflows-spec#59, у «Given» якого стоїть той самий вхідний текст (AC-DOCAI-01 — і для
// інших заявок на обслуговування: GC-02, 03, 06). Назва — літеральний рядок з AC ID на початку: ac:coverage читає
// назву з коду, а не після підстановки. Без .skip / .skipIf і без умови «є ключ».
const casesOf = (...ids: string[]) => cases.filter((c) => ids.includes(c.id));

async function expectGoldenReplay(c: GoldenCase) {
  const rec = recorded[c.id];
  expect(rec, `немає запису для ${c.id} у recorded.json`).toBeDefined();
  const model = replay(rec.text, rec.modelId);
  const result = await proposeDraft({ text: c.input }, model);
  expect(scoreFields(c.expected, okDraft(result)).mismatches).toEqual([]);
  // Недовірений вхід дійшов до моделі загорнутим як дані.
  expect(JSON.stringify(model.doGenerateCalls[0].prompt)).toContain("<document>");
}

describe("golden cases, офлайн-реплей", () => {
  it.each(casesOf("GC-01", "GC-02", "GC-03", "GC-06"))("AC-DOCAI-01: golden $id", async (c) => {
    await expectGoldenReplay(c);
  });
  it.each(casesOf("GC-07"))("AC-DOCAI-02: golden $id", async (c) => {
    await expectGoldenReplay(c);
  });
  it.each(casesOf("GC-04"))("AC-DOCAI-06: golden $id", async (c) => {
    await expectGoldenReplay(c);
  });
  it.each(casesOf("GC-05"))("AC-DOCAI-07: golden $id", async (c) => {
    await expectGoldenReplay(c);
  });
  it.each(casesOf("GC-08"))("AC-DOCAI-08: golden $id", async (c) => {
    await expectGoldenReplay(c);
  });
  it.each(casesOf("GC-09"))("AC-DOCAI-09: golden $id", async (c) => {
    await expectGoldenReplay(c);
  });
  it.each(casesOf("GC-10"))("AC-DOCAI-10: golden $id", async (c) => {
    await expectGoldenReplay(c);
  });

  it("кожен golden case PM має свій AC у назві тесту", () => {
    const covered = casesOf("GC-01", "GC-02", "GC-03", "GC-06", "GC-07", "GC-04", "GC-05", "GC-08", "GC-09", "GC-10");
    expect(covered.map((c) => c.id).sort()).toEqual(cases.map((c) => c.id).sort());
  });

  it("кейс 8 PM: розбіжність суми кошторису позначає КОД, навіть якщо модель її не помітила", async () => {
    const result = await proposeDraft({ text: "x" }, replay(recorded["GC-08"].text));
    expect(okDraft(result).notes).toContain("items add up to 220.00, the stated total is 200.00");
  });

  it("кейс 9 PM: відмова — жодного значення, навіть якщо модель їх повернула", async () => {
    const answer = JSON.stringify({ ...JSON.parse(recorded["GC-01"].text), status: "refused" });
    const result = await proposeDraft({ text: "x" }, replay(answer));
    expect(okDraft(result)).toMatchObject({ status: "refused", phone: null, description: null, category: null, items: null, total: null, notes: [] });
  });

  it("кожен golden case має запис, записаний поточною версією промпту", () => {
    const missing = cases.map((c) => c.id).filter((id) => !recorded[id]);
    expect(missing).toEqual([]);
    const stale = Object.entries(recorded)
      .filter(([, r]) => r.promptVersion !== DRAFT_PROMPT_VERSION)
      .map(([id]) => id);
    // Змінили DRAFT_PROMPT_VERSION — перезапишіть записи живим прогоном (README, «Перезапис записів»).
    expect(stale).toEqual([]);
  });
});

describe("запобіжники й збої", () => {
  it("відповідь не за схемою → invalid_output, нічого не зберігаємо", async () => {
    const result = await proposeDraft({ text: "x" }, replay('{"status":"ok","category":"dragons"}'));
    expect(result).toMatchObject({ ok: false, reason: "invalid_output" });
  });

  it("429 → rate_limited, повтор рівно maxRetries разів", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new APICallError({
          message: "Rate limit exceeded: free-models-per-day",
          url: "https://openrouter.ai/api/v1/chat/completions",
          requestBodyValues: {},
          statusCode: 429,
        });
      },
    });
    const result = await proposeDraft({ text: "x" }, model, { maxRetries: 1 });
    expect(result).toMatchObject({ ok: false, reason: "rate_limited" });
    expect(model.doGenerateCalls).toHaveLength(2);
  });

  it("HTTP 200 з тілом помилки code 429 → rate_limited (ліміт постачальника за OpenRouter)", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new APICallError({
          message: "Provider returned error",
          url: "u",
          requestBodyValues: {},
          statusCode: 200,
          data: { code: 429, message: "upstream rate limit" },
        });
      },
    });
    const result = await proposeDraft({ text: "x" }, model, { maxRetries: 2 });
    expect(result).toMatchObject({ ok: false, reason: "rate_limited" });
    expect(model.doGenerateCalls).toHaveLength(1); // statusCode 200 не повторюється
  });

  it("повільна модель → timeout", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async ({ abortSignal }) => {
        await new Promise((resolve, reject) => {
          const t = setTimeout(resolve, 5_000);
          abortSignal?.addEventListener("abort", () => {
            clearTimeout(t);
            reject(abortSignal.reason);
          });
        });
        throw new Error("unreachable");
      },
    });
    const result = await proposeDraft({ text: "x" }, model, { timeoutMs: 50, maxRetries: 0 });
    expect(result).toMatchObject({ ok: false, reason: "timeout" });
  });
});
