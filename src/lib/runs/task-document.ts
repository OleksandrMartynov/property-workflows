// Значення документа задачі (зріз 4 «AI document parsing», ADR 0008): підписи, розбір форми «Save values» і короткий
// підсумок для рядка задачі. Чисті функції: їх імпортують Server Action, діалог і тести. Форма приходить від людини
// (і може прийти напряму, в обхід інтерфейсу), тож тут — повторна перевірка тими самими правилами, що й для
// відповіді моделі; останнє слово — за функцією бази save_task_document.
import { z } from "zod";
import { CATEGORIES, LineItemSchema, URGENCIES, type LineItem } from "@/lib/ai/schema";
import { money, normalizePhone } from "@/lib/ai/rules";
import type { ErrorCode } from "./messages";

export type DocumentKind = "request" | "estimate";
export type Category = (typeof CATEGORIES)[number];
export type Urgency = (typeof URGENCIES)[number];

export const KIND_LABELS: Record<DocumentKind, string> = { request: "Request", estimate: "Estimate" };
export const CATEGORY_LABELS: Record<Category, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  heating_and_cooling: "Heating and cooling",
  appliance: "Appliance",
  structure_and_doors: "Structure and doors",
  other: "Other",
};
export const URGENCY_LABELS: Record<Urgency, string> = { urgent: "Urgent", not_urgent: "Not urgent" };

export const DESCRIPTION_MAX_LENGTH = 400;
export const MAX_ITEMS = 30;

/** Значення документа, як їх зберігає run_task_documents. */
export interface TaskDocument {
  kind: DocumentKind;
  phone: string | null;
  description: string | null;
  category: Category | null;
  urgency: Urgency | null;
  items: LineItem[] | null;
  total: number | null;
}

/** Рядок run_task_documents з бази (items — jsonb, total — numeric, може прийти рядком). */
export interface StoredTaskDocument {
  kind: string;
  phone: string | null;
  description: string | null;
  category: string | null;
  urgency: string | null;
  items: unknown;
  total: number | string | null;
}

const KINDS = ["request", "estimate"] as const;
const ItemsSchema = z.array(LineItemSchema.extend({ name: z.string().trim().min(1).max(120) })).max(MAX_ITEMS);

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();
const oneOf = <T extends string>(values: readonly T[], value: string): value is T => (values as readonly string[]).includes(value);

/** Сума з форми: «$1,250.00», «1250» → 1250; порожньо — null; не число чи від'ємне — undefined (помилка). */
export function parseMoney(raw: string): number | null | undefined {
  const clean = raw.replace(/[$,\s]/g, "");
  if (!clean) return null;
  if (!/^\d+(\.\d+)?$/.test(clean)) return undefined;
  return Math.round(Number(clean) * 100) / 100;
}

function parseItems(raw: string): LineItem[] | null | undefined {
  if (!raw) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const parsed = ItemsSchema.safeParse(json);
  if (!parsed.success) return undefined;
  return parsed.data.length ? parsed.data : null;
}

type Parsed = { ok: true; value: TaskDocument } | { ok: false; error: ErrorCode };

/** Форма «Save values» → значення для save_task_document або код помилки (тексти — у messages.ts). */
export function parseDocumentForm(formData: FormData): Parsed {
  const kind = field(formData, "kind");
  const rawPhone = field(formData, "phone");
  const description = field(formData, "description");
  const category = field(formData, "category");
  const urgency = field(formData, "urgency");
  const items = parseItems(field(formData, "items"));
  const total = parseMoney(field(formData, "total"));

  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !phone) return { ok: false, error: "PHONE_INVALID" };
  if (
    !oneOf(KINDS, kind) ||
    description.length > DESCRIPTION_MAX_LENGTH ||
    (category && !oneOf(CATEGORIES, category)) ||
    (urgency && !oneOf(URGENCIES, urgency)) ||
    items === undefined ||
    total === undefined
  ) {
    return { ok: false, error: "DOCUMENT_INVALID" };
  }

  const value: TaskDocument = {
    kind,
    phone,
    description: description || null,
    category: (category || null) as Category | null,
    urgency: (urgency || null) as Urgency | null,
    items,
    total,
  };
  const values = [value.phone, value.description, value.category, value.urgency, value.items, value.total];
  if (values.every((v) => v === null)) return { ok: false, error: "DOCUMENT_EMPTY" };
  return { ok: true, value };
}

/** Рядок бази → значення для діалогу й підсумку; невідоме (стара схема, ручний запис) відкидаємо. */
export function fromStored(row: StoredTaskDocument | null | undefined): TaskDocument | null {
  if (!row || !oneOf(KINDS, row.kind)) return null;
  const items = ItemsSchema.safeParse(row.items);
  const total = row.total === null ? null : Number(row.total);
  return {
    kind: row.kind,
    phone: row.phone,
    description: row.description,
    category: row.category && oneOf(CATEGORIES, row.category) ? row.category : null,
    urgency: row.urgency && oneOf(URGENCIES, row.urgency) ? row.urgency : null,
    items: items.success && items.data.length ? items.data : null,
    total: Number.isFinite(total) ? total : null,
  };
}

/** Короткий підсумок для рядка задачі: «Request · Plumbing · Urgent · 555-0101» або «Estimate · 2 items · Total 200.00». */
export function documentSummary(doc: TaskDocument): string {
  const parts: string[] = [KIND_LABELS[doc.kind]];
  if (doc.category) parts.push(CATEGORY_LABELS[doc.category]);
  if (doc.urgency) parts.push(URGENCY_LABELS[doc.urgency]);
  if (doc.phone) parts.push(doc.phone);
  if (doc.items) parts.push(`${doc.items.length} ${doc.items.length === 1 ? "item" : "items"}`);
  if (doc.total !== null) parts.push(`Total ${money(doc.total)}`);
  return parts.join(" · ");
}
