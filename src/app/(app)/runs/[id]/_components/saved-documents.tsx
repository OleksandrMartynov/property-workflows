import { Card } from "@/components/ui/card";
import { documentValues, formatConfirmedAt, fromStored, type StoredRunDocument } from "@/lib/runs/run-document";

/** Збережений запис документа запуску з бази: значення, хто й коли підтвердив. */
export interface SavedDocumentRow extends StoredRunDocument {
  id: string;
  saved_by: string;
  saved_at: string;
}

/**
 * Записи, які людина підтвердила в блоці «Parse a document» (AC-DOCAI-04): тип документа, значення, email того, хто
 * підтвердив, дата й час за Києвом; новіший — першим. Порожньо — нічого (AC-DOCAI-05: «no saved record»).
 */
export function SavedDocuments({ rows, emailOf }: { rows: SavedDocumentRow[]; emailOf: Map<string, string | null> }) {
  const records = rows.flatMap((row) => {
    const doc = fromStored(row);
    return doc ? [{ id: row.id, doc, by: emailOf.get(row.saved_by) ?? "—", at: formatConfirmedAt(row.saved_at) }] : [];
  });
  if (!records.length) return null;
  return (
    <section className="flex flex-col gap-2" aria-labelledby="saved-documents">
      <h2 id="saved-documents" className="px-1 text-heading">
        Saved documents
      </h2>
      <ul className="flex flex-col gap-3">
        {records.map((record) => (
          <li key={record.id} data-testid="saved-document">
            <Card className="flex flex-col gap-3 p-4">
              <dl className="grid gap-x-4 gap-y-2 text-body sm:grid-cols-[9rem_minmax(0,1fr)]">
                {documentValues(record.doc).map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-meta text-muted-foreground sm:pt-0.5">{label}</dt>
                    <dd className="min-w-0 break-words tabular">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-border pt-2 text-meta text-muted-foreground">
                <span className="break-words">{record.by}</span> · <span className="tabular">{record.at}</span>
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
