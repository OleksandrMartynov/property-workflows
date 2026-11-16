// Значення документа запуску (зріз 4, solomchaak/property-workflows-spec#59, AC-DOCAI-01…16; ADR 0008): підписи
// дослівно з AC, розбір форми «Save values» і значення збереженого запису. Чисті функції: їх імпортують Server Action,
// блок «Parse a document» і тести. Форма приходить від людини (і може прийти напряму, в обхід інтерфейсу), тож тут —
// повторна перевірка тими самими правилами, що й для відповіді моделі; останнє слово — за функцією бази
// save_run_document.
import { z } from "zod";
import { CATEGORIES, LineItemSchema, URGENCIES, type LineItem } from "@/lib/ai/schema";
import { money, normalizePhone } from "@/lib/ai/rules";
import type { ErrorCode } from "./messages";

export type DocumentKind = "request" | "estimate";
export type Category = (typeof CATEGORIES)[number];
export type Urgency = (typeof URGENCIES)[number];

// Тексти — дослівно з AC-DOCAI-01…10 і припущень PM: Document type «Maintenance request» / «Estimate», категорії й
// терміновість малими літерами («plumbing», «heating and cooling», «not urgent»).
export const KIND_LABELS: Record<DocumentKind, string> = { request: "Maintenance request", estimate: "Estimate" };
export const CATEGORY_LABELS: Record<Category, string> = {
  plumbing: "plumbing",
  electrical: "electrical",
  heating_and_cooling: "heating and cooling",
  appliance: "appliance",
  structure_and_doors: "structure and doors",
  other: "other",
};
export const URGENCY_LABELS: Record<Urgency, string> = { urgent: "urgent", not_urgent: "not urgent" };

export const DESCRIPTION_MAX_LENGTH = 400;
export const MAX_ITEMS = 30;

/** Значення документа, як їх зберігає run_documents. */
export interface RunDocument {
  kind: DocumentKind;
  phone: string | null;
  description: string | null;
  category: Category | null;
  urgency: Urgency | null;
  items: LineItem[] | null;
  total: number | null;
}

/** Рядок run_documents з бази (items — jsonb, total — numeric, може прийти рядком). */
export interface StoredRunDocument {
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

type Parsed = { ok: true; value: RunDocument } | { ok: false; error: ErrorCode };

/** Форма «Save values» → значення для save_run_document або код помилки (тексти — у messages.ts). */
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

  const value: RunDocument = {
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

/** Рядок бази → значення для запису на сторінці; невідоме (ручний запис поза переліками) відкидаємо. */
export function fromStored(row: StoredRunDocument | null | undefined): RunDocument | null {
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

/** Значення збереженого запису для сторінки запуску (AC-DOCAI-04): підпис → значення; порожні не показуємо. */
export function documentValues(doc: RunDocument): [label: string, value: string][] {
  const rows: [string, string | null][] = [
    ["Document type", KIND_LABELS[doc.kind]],
    ["Phone", doc.phone],
    ["Description", doc.description],
    ["Category", doc.category && CATEGORY_LABELS[doc.category]],
    ["Urgency", doc.urgency && URGENCY_LABELS[doc.urgency]],
    ["Items", doc.items && doc.items.map((item) => `${item.name} ${item.quantity} x ${money(item.unitPrice)}`).join("; ")],
    ["Total", doc.total === null ? null : money(doc.total)],
  ];
  return rows.filter((row): row is [string, string] => Boolean(row[1]));
}
