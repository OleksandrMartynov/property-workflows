import { documentSummary, fromStored, type StoredTaskDocument } from "@/lib/runs/task-document";

/** Збережені значення документа під назвою задачі: «Request · Plumbing · Urgent · 555-0101» (зріз 4, ADR 0008). */
export function TaskDocumentSummary({ document }: { document: StoredTaskDocument | null | undefined }) {
  const doc = fromStored(document);
  if (!doc) return null;
  return (
    <span className="block break-words" data-testid="task-document">
      {documentSummary(doc)}
    </span>
  );
}
