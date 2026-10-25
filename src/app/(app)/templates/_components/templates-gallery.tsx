"use client";

import { useState, type ComponentProps } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { TemplatesList } from "./templates-list";

/** Галерея шаблонів із пошуком за назвою (без урахування регістру). Порожній список — «No templates yet.» з TemplatesList. */
export function TemplatesGallery(props: ComponentProps<typeof TemplatesList>) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? props.templates.filter((t) => t.name.toLowerCase().includes(q)) : props.templates;

  if (!props.templates.length) return <TemplatesList {...props} />;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={query} onValueChange={setQuery} placeholder="Search templates" aria-label="Search templates" className="w-full sm:w-72" />
        <span className="tabular text-meta text-muted-foreground" aria-live="polite">
          {q ? `${shown.length} of ${props.templates.length}` : `${props.templates.length} ${props.templates.length === 1 ? "template" : "templates"}`}
        </span>
      </div>
      {shown.length ? <TemplatesList {...props} templates={shown} /> : <EmptyState title="No templates found." />}
    </div>
  );
}
