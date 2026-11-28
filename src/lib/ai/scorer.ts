import { Output, generateText, type LanguageModel } from "ai";
import { z } from "zod";
import { JUDGE_INSTRUCTIONS, judgePrompt } from "./prompts/judge";
import type { Draft } from "./schema";

// Один golden case від PM: вхід → очікуване. Формат файлу — tests/fixtures/golden/cases.json.
export type ExpectedField = "status" | "kind" | "phone" | "category" | "urgency" | "items" | "total" | "notes";
export type GoldenCase = {
  id: string; // "GC-01" — номер кейсу PM у solomchaak/property-workflows-spec#40
  input: string;
  // Лише ті значення, які PM фіксує однозначно (телефон, категорія, терміновість, позиції, сума, примітки). Порівнюються
  // точно: правило PM від 16.11 (solomchaak/property-workflows-spec#40) — «warnings, notes and refusals must match exactly».
  expected: Partial<Pick<Draft, ExpectedField>>;
  // Слова PM: що опис і примітки мають містити / чого не мають. Оцінює LLM-суддя лише в живому eval.
  rubric?: string;
};

/** JSON із ключами об'єктів за абеткою (порядок елементів масиву лишається): `{a,b}` і `{b,a}` — один рядок. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Примітки — набір: порядок не важить, текст — дослівно, зайва примітка теж розбіжність. */
const sortedNotes = (notes: unknown) => (Array.isArray(notes) ? [...notes].sort() : notes);

// (1) Детермінована частина: точний збіг значень, зафіксованих PM (масиви позицій — поелементно, порядок ключів
// об'єкта не важить; примітки — набором).
export function scoreFields(expected: GoldenCase["expected"], actual: Draft) {
  const same = (k: ExpectedField) =>
    k === "notes" ? canonical(sortedNotes(expected.notes)) === canonical(sortedNotes(actual.notes)) : canonical(expected[k]) === canonical(actual[k]);
  const mismatches = (Object.keys(expected) as ExpectedField[])
    .filter((k) => !same(k))
    .map((k) => ({ field: k, expected: expected[k], actual: actual[k] }));
  return { pass: mismatches.length === 0, mismatches };
}

/** Вільний текст пропозиції для судді: опис і примітки — те, що людина читає поруч зі значеннями. */
export const judgedText = (draft: Draft) => [draft.description ? `Description: ${draft.description}` : "", ...draft.notes.map((n) => `Note: ${n}`)].filter(Boolean).join("\n") || "(no description, no notes)";

// (2) Нечітка частина: LLM-суддя лише для вільного тексту, двійковий вердикт із причиною.
const Verdict = z.object({ pass: z.boolean(), reason: z.string().max(300) });
export type JudgeVerdict = z.infer<typeof Verdict>;

export async function judgeSummary(judge: LanguageModel, rubric: string, summary: string): Promise<JudgeVerdict> {
  const { output } = await generateText({
    model: judge,
    instructions: JUDGE_INSTRUCTIONS,
    prompt: judgePrompt(rubric, summary),
    output: Output.object({ name: "verdict", schema: Verdict }),
    temperature: 0,
    maxRetries: 0, // повтор на безкоштовному тарифі витрачає той самий денний ліміт
  });
  return output;
}

// Частка успіху (pass rate) — визначення з WS8: прогін на задачах із відомими відповідями (ключ) → бал.
export function passRate(results: { pass: boolean }[]): { passed: number; total: number; rate: number } {
  const passed = results.filter((r) => r.pass).length;
  return { passed, total: results.length, rate: results.length ? passed / results.length : 0 };
}
