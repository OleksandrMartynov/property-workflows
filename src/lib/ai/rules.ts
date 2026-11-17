import type { Draft, LineItem } from "./schema";

// Правила, які перевіряє КОД після відповіді моделі (модель пропонує, сервер перевіряє). Чисті функції: їх
// імпортують proposeDraft, Server Action збереження й тести.

// Кейс 9 PM: документ не є ні заявкою, ні кошторисом — жодних значень, лише це повідомлення.
export const REFUSED_MESSAGE = "This document is not a maintenance request or an estimate.";
// needs_info: це заявка чи кошторис, але проблеми чи позицій у документі немає — людина заповнює значення сама.
export const NEEDS_INFO_MESSAGE = "The document does not say what is wrong or what the items are. Fill in the values yourself.";
// Кейс 4 PM: значення, якого немає в документі, лишається порожнім і позначене «not found».
export const NOT_FOUND = "not found";
// Примітки — дослівно з AC-DOCAI-07 і AC-DOCAI-10: модель може сказати те саме іншими словами, код зводить до тексту PM.
export const TWO_PROBLEMS_NOTE = "the email has two problems";
export const INSTRUCTIONS_NOTE = "the text contains instructions to the AI that were ignored";

/** Примітки моделі → тексти PM (AC-DOCAI-07, 10) без повторів; інші примітки (наприклад, ризик) — як є. */
export function normalizeNotes(notes: string[]): string[] {
  const out = notes.map((note) => {
    if (/\b(two|several|multiple|more than one)\b.*\bproblems?\b/i.test(note)) return TWO_PROBLEMS_NOTE;
    // Лише примітка про проігноровані інструкції; ризик зі словом «instructions» лишається як є.
    if (/\binstructions?\b/i.test(note) && /\bignor(ed|ing)\b/i.test(note)) return INSTRUCTIONS_NOTE;
    return note;
  });
  return [...new Set(out)];
}

/** Телефон з документа в одній формі 555-0101; не телефон (не 7 цифр) — null, а не вигадана форма. */
export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length === 7 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : null;
}

const cents = (value: number) => Math.round(value * 100);
export const money = (value: number) => (cents(value) / 100).toFixed(2);

/** Сума позицій кошторису: кількість × ціна одиниці, у центах, щоб не накопичувати похибку дробів. */
export function itemsTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + cents(item.quantity * item.unitPrice), 0) / 100;
}

/** Кейс 8 PM: сума позицій не збігається із заявленою — попередження; числа документа не виправляємо. */
export function totalWarning(items: LineItem[] | null, total: number | null): string | null {
  if (!items?.length || total === null) return null;
  const sum = itemsTotal(items);
  return cents(sum) === cents(total) ? null : `items add up to ${money(sum)}, the stated total is ${money(total)}`;
}

export function applyRules(draft: Draft): Draft {
  if (draft.status === "refused") {
    return { ...draft, kind: null, phone: null, description: null, category: null, urgency: null, items: null, total: null, notes: [] };
  }
  // needs_info (schema.ts): проблему чи позиції визначити не можна — значень проблеми й кошторису немає, лишаються
  // вид документа, телефон (факт із документа, не вигадка) і примітки.
  if (draft.status === "needs_info") {
    return { ...draft, phone: normalizePhone(draft.phone), description: null, category: null, urgency: null, items: null, total: null };
  }
  const warning = totalWarning(draft.items, draft.total);
  const notes = normalizeNotes(draft.notes.filter((note) => !/^items add up to /i.test(note)));
  return { ...draft, phone: normalizePhone(draft.phone), notes: warning ? [...notes, warning] : notes };
}
