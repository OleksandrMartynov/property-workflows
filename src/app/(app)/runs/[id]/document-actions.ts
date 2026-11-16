"use server";

// Зріз 4 «Parse a document and confirm the values» (solomchaak/property-workflows-spec#59, AC-DOCAI-01…16; ADR 0008):
// дві дії блоку на сторінці запуску, між ними — людина.
//   1. requestDocumentDraft — хто кличе (getClaims через requireViewer) і чи це менеджер запуску чи адміністратор
//      (check_run_document) ДО виклику моделі; модель лише ПРОПОНУЄ значення, дія повертає їх у форму й нічого не пише
//      (AC-DOCAI-01: «nothing is saved yet»).
//   2. saveRunDocument — людина переглянула, виправила й натиснула «Save values»: повторна перевірка форми кодом
//      (parseDocumentForm) і запис функцією бази save_run_document під сесією користувача (AC-DOCAI-04, 13).
// Будь-хто інший — «Not enough rights», без значень і без запису (AC-DOCAI-16). Вставлений текст і відповідь AI не
// зберігаються («Поза межами» PM).
import { revalidatePath } from "next/cache";
import { ASSISTANT_UNAVAILABLE, proposeDraft } from "@/lib/ai/draft";
import { productModel } from "@/lib/ai/openrouter";
import { MAX_DOCUMENT_CHARS } from "@/lib/ai/prompts/draft";
import { NEEDS_INFO_MESSAGE, REFUSED_MESSAGE } from "@/lib/ai/rules";
import type { Draft } from "@/lib/ai/schema";
import { MESSAGES, dbErrorCode } from "@/lib/runs/messages";
import { parseDocumentForm } from "@/lib/runs/run-document";
import { requireViewer } from "@/lib/supabase/viewer";
import { isUuid } from "@/lib/templates/current";

/**
 * draft — пропозиція на перевірку; unavailable — помічник недоступний, людина заповнює значення сама (AC-DOCAI-13);
 * error — відмова, порожній текст, немає права: жодного значення (AC-DOCAI-09, 11, 16).
 */
export type DocumentDraftState =
  | { status: "draft"; draft: Draft; notice: string | null }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string }
  | null;

export type SaveDocumentState = { status: "saved" } | { status: "error"; message: string } | null;

const failed = (message: string) => ({ status: "error" as const, message });

/** Права на документ запуску: менеджер запуску чи адміністратор; інакше — текст відмови (AC-DOCAI-16). */
async function checkAccess(runId: string) {
  const { supabase } = await requireViewer();
  if (!isUuid(runId)) return { supabase, denied: MESSAGES.RUN_NOT_FOUND };
  const { error } = await supabase.rpc("check_run_document", { p_run_id: runId });
  return { supabase, denied: error ? MESSAGES[dbErrorCode(error)] : null };
}

export async function requestDocumentDraft(_prev: DocumentDraftState, formData: FormData): Promise<DocumentDraftState> {
  // Авторизація ДО виклику моделі: інакше будь-хто витратив би денний ліміт безкоштовних моделей.
  const { denied } = await checkAccess(String(formData.get("run_id") ?? ""));
  if (denied) return failed(denied);

  const text = String(formData.get("text") ?? "");
  if (!text.trim()) return failed(MESSAGES.DOCUMENT_INPUT_REQUIRED);
  // Довший текст модель не побачила б цілком (wrapDocument обрізає) — кажемо про це, а не обрізаємо мовчки.
  if (text.length > MAX_DOCUMENT_CHARS) return failed(MESSAGES.DOCUMENT_TOO_LONG);

  // Немає ключа, ліміт, тайм-аут, нечитана відповідь — «недоступний»: значення людина вводить сама (AC-DOCAI-13).
  const model = productModel();
  const result = model ? await proposeDraft({ text }, model) : null;
  if (!result?.ok) return { status: "unavailable", message: ASSISTANT_UNAVAILABLE };
  // AC-DOCAI-09: не заявка й не кошторис — жодних значень, лише повідомлення.
  if (result.draft.status === "refused") return failed(REFUSED_MESSAGE);
  return {
    status: "draft",
    draft: result.draft,
    notice: result.draft.status === "needs_info" ? NEEDS_INFO_MESSAGE : null,
  };
}

export async function saveRunDocument(_prev: SaveDocumentState, formData: FormData): Promise<SaveDocumentState> {
  const runId = String(formData.get("run_id") ?? "");
  const { supabase, denied } = await checkAccess(runId);
  if (denied) return failed(denied);

  // Клієнт може надіслати що завгодно: ті самі правила, що й для відповіді моделі, ще раз — тут.
  const parsed = parseDocumentForm(formData);
  if (!parsed.ok) return failed(MESSAGES[parsed.error]);
  const doc = parsed.value;

  const { error } = await supabase.rpc("save_run_document", {
    p_run_id: runId,
    p_kind: doc.kind,
    p_phone: doc.phone,
    p_description: doc.description,
    p_category: doc.category,
    p_urgency: doc.urgency,
    p_items: doc.items,
    p_total: doc.total,
  });
  if (error) return failed(MESSAGES[dbErrorCode(error)]);

  revalidatePath(`/runs/${runId}`);
  return { status: "saved" };
}
