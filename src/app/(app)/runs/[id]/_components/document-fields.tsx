"use client";

// Поля значень документа задачі (крок 2 «Parse document», ADR 0008): початкові — з пропозиції AI, інакше зі
// збереженого. Порожнє поле пропозиції — підказка «not found» (кейс 4 PM: значення, якого немає в документі, не
// вигадуємо). Позиції кошторису — рядки, які людина додає, змінює й прибирає; у форму йдуть одним JSON.
import { useState, type Dispatch, type SetStateAction } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { NOT_FOUND, totalWarning } from "@/lib/ai/rules";
import type { Draft, LineItem } from "@/lib/ai/schema";
import {
  CATEGORY_LABELS,
  DESCRIPTION_MAX_LENGTH,
  KIND_LABELS,
  MAX_ITEMS,
  URGENCY_LABELS,
  parseMoney,
  type TaskDocument,
} from "@/lib/runs/task-document";

const options = (labels: Record<string, string>, empty = true) => [
  ...(empty ? [{ value: "", label: "—" }] : []),
  ...Object.entries(labels).map(([value, label]) => ({ value, label })),
];

type ItemRow = { key: number; name: string; quantity: string; unitPrice: string };
const toRows = (items: LineItem[] | null | undefined): ItemRow[] =>
  (items ?? []).map((item, i) => ({ key: i, name: item.name, quantity: String(item.quantity), unitPrice: String(item.unitPrice) }));
const isBlank = (r: ItemRow) => !r.name.trim() && !r.quantity.trim() && !r.unitPrice.trim();

/** Рядки → JSON для форми; порожній рядок не надсилаємо, недійсне число — null у JSON, його відхилить сервер. */
function itemsJson(rows: ItemRow[]): string {
  return JSON.stringify(
    rows.filter((r) => !isBlank(r)).map((r) => ({ name: r.name.trim(), quantity: Number(r.quantity), unitPrice: parseMoney(r.unitPrice) ?? Number.NaN })),
  );
}

/** Кейс 8 PM уже під час введення: сума позицій не збігається із заявленою — попередження, числа не виправляємо. */
function liveWarning(rows: ItemRow[], total: string): string | null {
  const stated = parseMoney(total);
  if (typeof stated !== "number") return null;
  const items: LineItem[] = [];
  for (const r of rows) {
    const unitPrice = parseMoney(r.unitPrice);
    const quantity = Number(r.quantity);
    if (r.name.trim() && Number.isFinite(quantity) && typeof unitPrice === "number") items.push({ name: r.name, quantity, unitPrice });
  }
  return totalWarning(items, stated);
}

export function ValueFields({ id, draft, saved }: { id: string; draft: Draft | null; saved: TaskDocument | null }) {
  const source = draft ?? saved;
  const missing = draft ? NOT_FOUND : undefined;
  const [rows, setRows] = useState<ItemRow[]>(() => toRows(source?.items));
  const [total, setTotal] = useState(source?.total == null ? "" : String(source.total));
  const warning = liveWarning(rows, total);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={`${id}-kind`} label="Kind" required>
        <Select id={`${id}-kind`} name="kind" defaultValue={source?.kind ?? "request"} options={options(KIND_LABELS, false)} />
      </Field>
      <Field id={`${id}-phone`} label="Phone">
        <Input name="phone" inputMode="tel" autoComplete="off" defaultValue={source?.phone ?? ""} placeholder={missing} />
      </Field>
      <Field id={`${id}-category`} label="Category">
        <Select id={`${id}-category`} name="category" defaultValue={source?.category ?? ""} placeholder={missing} options={options(CATEGORY_LABELS)} />
      </Field>
      <Field id={`${id}-urgency`} label="Urgency">
        <Select id={`${id}-urgency`} name="urgency" defaultValue={source?.urgency ?? ""} placeholder={missing} options={options(URGENCY_LABELS)} />
      </Field>
      <Field id={`${id}-description`} label="Description" className="sm:col-span-2" counter={DESCRIPTION_MAX_LENGTH}>
        <Textarea name="description" rows={2} maxLength={DESCRIPTION_MAX_LENGTH} defaultValue={source?.description ?? ""} placeholder={missing} />
      </Field>
      <ItemsEditor rows={rows} setRows={setRows} missing={missing} />
      <Field id={`${id}-total`} label="Total">
        <Input name="total" inputMode="decimal" className="tabular" value={total} onChange={(e) => setTotal(e.target.value)} placeholder={missing} />
      </Field>
      {warning ? (
        <Alert variant="info" className="self-end">
          {warning}
        </Alert>
      ) : null}
    </div>
  );
}

function ItemsEditor({ rows, setRows, missing }: { rows: ItemRow[]; setRows: Dispatch<SetStateAction<ItemRow[]>>; missing?: string }) {
  const patch = (key: number, change: Partial<ItemRow>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...change } : r)));
  const add = () => setRows((all) => [...all, { key: all.reduce((max, r) => Math.max(max, r.key), -1) + 1, name: "", quantity: "1", unitPrice: "" }]);

  return (
    <fieldset className="flex flex-col gap-2 sm:col-span-2">
      <legend className="mb-1.5 text-label">Items</legend>
      <input type="hidden" name="items" value={itemsJson(rows)} />
      {rows.length === 0 && missing ? <p className="text-meta text-muted-foreground">{missing}</p> : null}
      <ul className="flex flex-col gap-2 empty:hidden">
        {rows.map((row, i) => (
          <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_auto] items-center gap-2">
            <Input aria-label={`Item ${i + 1} name`} value={row.name} maxLength={120} onChange={(e) => patch(row.key, { name: e.target.value })} />
            <Input aria-label={`Item ${i + 1} quantity`} inputMode="decimal" className="tabular" value={row.quantity} onChange={(e) => patch(row.key, { quantity: e.target.value })} />
            <Input aria-label={`Item ${i + 1} unit price`} inputMode="decimal" className="tabular" value={row.unitPrice} onChange={(e) => patch(row.key, { unitPrice: e.target.value })} />
            <Button variant="ghost" size="icon" aria-label={`Remove item ${i + 1}`} onClick={() => setRows((all) => all.filter((r) => r.key !== row.key))}>
              <TrashIcon />
            </Button>
          </li>
        ))}
      </ul>
      {rows.length < MAX_ITEMS ? (
        <Button variant="outline" size="sm" className="self-start" onClick={add}>
          <PlusIcon />
          Add item
        </Button>
      ) : null}
    </fieldset>
  );
}
