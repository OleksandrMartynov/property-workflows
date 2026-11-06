"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogCancel, DialogFooter, DialogHeader } from "@/components/ui/dialog";
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
  const close = () => {
    setOpen(false);
    setError(undefined);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} aria-haspopup="dialog">
        <PlusIcon />
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={close}
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
          <DialogHeader icon={<TemplateIcon />} title="New template" titleId={`${id}-title`}>
            <Field id={`${id}-name`} label="Template name" error={error}>
              <Input name="name" size="lg" autoFocus autoComplete="off" onChange={() => setError(undefined)} />
            </Field>
          </DialogHeader>
          <DialogFooter>
            <DialogCancel onClick={close} />
            <SubmitButton pendingText="Creating…">Create</SubmitButton>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
