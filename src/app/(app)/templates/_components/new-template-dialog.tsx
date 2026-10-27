"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { PlusIcon, TemplateIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { MESSAGES } from "@/lib/runs/messages";
import { SubmitButton } from "@/app/_components/submit-button";
import { createTemplate } from "../[id]/edit/actions";

/**
 * «New template» у галереї шаблонів: діалог із назвою замість переходу на окрему сторінку. «Create» створює шаблон
 * без версії й відкриває редактор (дія та сама, що й на /templates/new — сторінка лишається для прямих посилань і
 * помилок сервера). Порожню назву ловимо одразу — та сама відмова, що й на сервері («Enter a template name», AC-EDITOR-19).
 */
export function NewTemplateDialog({ label = "New template" }: { label?: string } = {}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const id = useId();

  return (
    <>
      <Button onClick={() => setOpen(true)} aria-haspopup="dialog">
        <PlusIcon />
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setError(undefined);
        }}
        labelledBy={`${id}-title`}
      >
        <form
          action={createTemplate}
          noValidate
          onSubmit={(event) => {
            const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
            if (!name) {
              event.preventDefault();
              setError(MESSAGES.TEMPLATE_NAME_REQUIRED);
            }
          }}
        >
          <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-state-selected text-primary" aria-hidden="true">
                <TemplateIcon />
              </span>
              <h2 id={`${id}-title`} className="text-title">
                New template
              </h2>
            </div>
            <Field id={`${id}-name`} label="Template name" error={error}>
              <Input name="name" size="lg" autoFocus autoComplete="off" onChange={() => setError(undefined)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-border bg-muted/40 px-5 py-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingText="Creating…">Create</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
