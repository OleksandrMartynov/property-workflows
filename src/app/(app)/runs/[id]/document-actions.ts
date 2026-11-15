"use server";

// Зріз 4 «AI document parsing» (ADR 0008): дві дії, між ними — людина.
//   1. requestDocumentDraft — хто кличе (getClaims через requireViewer) і чи можна працювати з документом цієї
//      задачі (check_task_document — ті самі права, що в позначки задачі) ДО виклику моделі; модель лише ПРОПОНУЄ
//      значення, дія повертає їх у форму й нічого не пише.
//   2. saveTaskDocument — людина переглянула, виправила й натиснула «Save values»: повторна перевірка форми кодом
//      (parseDocumentForm) і запис функцією бази save_task_document під сесією користувача (RLS, права, статуси).
// Взято з koldovsky/2026-quitcode-10-ai-features-hw/materials/ai-feature/src/app/ai-draft/actions.ts і перенесено
// в сторінку запуску.
import { revalidatePath } from "next/cache";
import { USER_MESSAGES, isFileType, proposeDraft, type DraftInput } from "@/lib/ai/draft";
import { productModel } from "@/lib/ai/openrouter";
import { NEEDS_INFO_MESSAGE, REFUSED_MESSAGE } from "@/lib/ai/rules";
import type { Draft } from "@/lib/ai/schema";
import { MESSAGES, dbErrorCode, type ErrorCode } from "@/lib/runs/messages";
import { parseDocumentForm } from "@/lib/runs/task-document";
import { requireViewer } from "@/lib/supabase/viewer";
import { isUuid } from "@/lib/templates/current";

// Найбільший файл документа: 1 МБ (межу тіла Server Action піднято до 2 МБ у next.config.ts).
const MAX_FILE_BYTES = 1024 * 1024;
// Довший текст однаково обріже wrapDocument (MAX_DOCUMENT_CHARS); тут — щоб не тримати в пам'яті мегабайти.
const MAX_TEXT_CHARS = 20_000;

export type DocumentDraftState =
  | { status: "draft"; draft: Draft; notice: string | null; at: number }
  | { status: "error"; message: string; at: number }
  | null;

export type SaveDocumentState = { status: "saved"; at: number } | { status: "error"; message: string; at: number } | null;

const failed = (message: string) => ({ status: "error" as const, message, at: Date.now() });

/** Документ із форми: текст і (за потреби) файл PDF / PNG / JPEG до 1 МБ; інакше — код помилки для повідомлення. */
async function readDocument(formData: FormData): Promise<DraftInput | ErrorCode> {
  const text = String(formData.get("text") ?? "").slice(0, MAX_TEXT_CHARS);
  const file = formData.get("file");
  const attached = file instanceof File && file.size > 0 ? file : null;
  if (!attached) return text.trim() ? { text } : "DOCUMENT_INPUT_REQUIRED";
  const mediaType = attached.type;
  if (attached.size > MAX_FILE_BYTES || !isFileType(mediaType)) return "DOCUMENT_FILE_INVALID";
  return { text, file: { data: new Uint8Array(await attached.arrayBuffer()), mediaType, filename: attached.name } };
}

export async function requestDocumentDraft(_prev: DocumentDraftState, formData: FormData): Promise<DocumentDraftState> {
  // Авторизація ДО виклику моделі: інакше будь-хто витратив би денний ліміт безкоштовних моделей (50 запитів).
  const { supabase } = await requireViewer();
  const taskId = String(formData.get("task_id") ?? "");
  if (!isUuid(taskId)) return failed(MESSAGES.TASK_NOT_FOUND);
  const { error } = await supabase.rpc("check_task_document", { p_task_id: taskId });
  if (error) return failed(MESSAGES[dbErrorCode(error)]);

  const input = await readDocument(formData);
  if (typeof input === "string") return failed(MESSAGES[input]);

  // Немає ключа (або лише пробіли) — стан «недоступний», а не сторінка помилки: значення людина вводить сама.
  const model = productModel();
  if (!model) return failed(USER_MESSAGES.provider_error);
  const result = await proposeDraft(input, model);
  if (!result.ok) return failed(USER_MESSAGES[result.reason]);
  // Кейс 9 PM: не заявка й не кошторис — жодних значень у формі, лише повідомлення.
  if (result.draft.status === "refused") return failed(REFUSED_MESSAGE);
  return {
    status: "draft",
    draft: result.draft,
    notice: result.draft.status === "needs_info" ? NEEDS_INFO_MESSAGE : null,
    at: Date.now(),
  };
}

export async function saveTaskDocument(_prev: SaveDocumentState, formData: FormData): Promise<SaveDocumentState> {
  const { supabase } = await requireViewer();
  const runId = String(formData.get("run_id") ?? "");
  const taskId = String(formData.get("task_id") ?? "");
  if (!isUuid(runId) || !isUuid(taskId)) return failed(MESSAGES.TASK_NOT_FOUND);

  // Клієнт може надіслати що завгодно: ті самі правила, що й для відповіді моделі, ще раз — тут.
  const parsed = parseDocumentForm(formData);
  if (!parsed.ok) return failed(MESSAGES[parsed.error]);
  const doc = parsed.value;

  const { error } = await supabase.rpc("save_task_document", {
    p_task_id: taskId,
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
  return { status: "saved", at: Date.now() };
}
