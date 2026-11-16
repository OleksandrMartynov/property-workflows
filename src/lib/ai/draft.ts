import {
  APICallError,
  NoObjectGeneratedError,
  Output,
  RetryError,
  generateText,
  type LanguageModel,
  type UserContent,
} from "ai";
import { DRAFT_INSTRUCTIONS, wrapDocument } from "./prompts/draft";
import { DraftSchema, type Draft } from "./schema";
import { applyRules } from "./rules";

// `ProviderOptions` не експортується з "ai" 7.0.162 — беремо тип із параметрів generateText.
type ProviderOptions = NonNullable<Parameters<typeof generateText>[0]["providerOptions"]>;

// Файли (PDF, зображення) пропонує ланцюжок моделей (ADR 0008); застосунок за вимогою PM передає лише текст (ADR 0009).
export type FileType = "application/pdf" | "image/png" | "image/jpeg";

// Чиста функція: модель передають параметром. Застосунок передає модель OpenRouter (src/lib/ai/openrouter.ts),
// тести — MockLanguageModelV4 із записаною відповіддю. Тут немає `import "server-only"` і немає process.env,
// тому Vitest може імпортувати цей файл.

export type DraftInput = {
  text: string;
  file?: { data: Uint8Array; mediaType: FileType; filename?: string };
};

export type DraftResult =
  | { ok: true; draft: Draft; modelId: string }
  | { ok: false; reason: "invalid_output" | "rate_limited" | "timeout" | "provider_error"; message: string };

export type DraftOptions = {
  maxRetries?: number;
  timeoutMs?: number;
  providerOptions?: ProviderOptions;
};

export async function proposeDraft(input: DraftInput, model: LanguageModel, opts: DraftOptions = {}): Promise<DraftResult> {
  const content: UserContent = [{ type: "text", text: wrapDocument(input.text) }];
  if (input.file) {
    // AI SDK 7: і зображення, і PDF — частина `type: "file"`.
    content.push({ type: "file", data: input.file.data, mediaType: input.file.mediaType, filename: input.file.filename });
  }

  try {
    const result = await generateText({
      model,
      instructions: DRAFT_INSTRUCTIONS, // `system` в AI SDK 7 застаріле
      messages: [{ role: "user", content }],
      output: Output.object({ name: "draft", schema: DraftSchema }), // generateObject застарілий
      temperature: 0,
      // На безкоштовному тарифі повтор витрачає той самий денний ліміт: 0–1, не типові 2.
      maxRetries: opts.maxRetries ?? 1,
      timeout: opts.timeoutMs ?? 45_000,
      providerOptions: opts.providerOptions,
    });
    // result.output уже перевірено за DraftSchema (інакше — виняток NoObjectGeneratedError). Правила, які можна
    // перевірити кодом (формат телефону, сума кошторису, порожні значення відмови), — тут, а не лише в промпті.
    return { ok: true, draft: applyRules(result.output), modelId: result.response.modelId };
  } catch (error) {
    return classifyError(error);
  }
}

export function classifyError(error: unknown): Extract<DraftResult, { ok: false }> {
  // Після повторів AI SDK загортає останню помилку в RetryError — спершу розгортаємо.
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  if (NoObjectGeneratedError.isInstance(cause)) {
    return { ok: false, reason: "invalid_output", message: "model output did not match the schema" };
  }
  if (APICallError.isInstance(cause)) {
    // OpenRouter може відповісти HTTP 200 з тілом `error`; провайдер тоді кидає statusCode 200 + data.
    const code = cause.statusCode === 200 ? (cause.data as { code?: unknown } | undefined)?.code : cause.statusCode;
    if (code === 429 || code === "429") {
      return { ok: false, reason: "rate_limited", message: "free-model limit reached, try later" };
    }
  }
  if (cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError")) {
    return { ok: false, reason: "timeout", message: "model did not answer in time" };
  }
  return { ok: false, reason: "provider_error", message: cause instanceof Error ? cause.message : String(cause) };
}

// AC-DOCAI-13: будь-яка недоступність помічника (немає ключа, ліміт, тайм-аут, нечитана відповідь) — один текст PM
// дослівно; людина заповнює значення сама. Причину (reason) пишемо лише в журнал сервера.
export const ASSISTANT_UNAVAILABLE = "The assistant is not available now. Fill in the values yourself.";
