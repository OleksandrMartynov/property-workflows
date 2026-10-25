"use client";

import { useId, useRef, useState } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ArrowDownIcon, ArrowUpIcon, MoveToIcon, TrashIcon } from "@/components/ui/icons";
import { CANNOT_BE_UNDONE } from "@/lib/runs/confirmation";
import { moveSection, moveTask, moveTaskToSection, removeSection, removeTask } from "../actions";

/**
 * Дії секції чи задачі в редакторі: стрілки ↑ ↓ (видно під курсором і у фокусі рядка) і меню «⋯» — вгору, вниз,
 * у іншу секцію (лише задача), видалити. Видалення — лише після «OK» у `ConfirmDialog`: заголовок — назва,
 * «This cannot be undone» («Вигляд і тон»; питання QE до PM). Кожна дія — схована форма з server action, тож
 * перевірка ролі й запис — на сервері, як і раніше.
 */
export function ItemActions({
  templateId,
  kind,
  id,
  name,
  canMoveUp,
  canMoveDown,
  moveTargets = [],
}: {
  templateId: string;
  kind: "section" | "task";
  id: string;
  name: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Інші секції шаблону — куди можна перенести задачу. */
  moveTargets?: { id: string; name: string }[];
}) {
  const uid = useId();
  const [confirming, setConfirming] = useState(false);
  const up = useRef<HTMLFormElement>(null);
  const down = useRef<HTMLFormElement>(null);
  const moveTo = useRef<HTMLFormElement>(null);
  const target = useRef<HTMLInputElement>(null);
  const remove = useRef<HTMLFormElement>(null);

  const idField = kind === "section" ? "section_id" : "task_id";
  const move = kind === "section" ? moveSection : moveTask;
  const noun = kind === "section" ? "section" : "task";
  const hidden = (
    <>
      <input type="hidden" name="template_id" value={templateId} />
      <input type="hidden" name={idField} value={id} />
    </>
  );

  const items: ActionMenuItem[] = [
    { label: "Move up", icon: <ArrowUpIcon />, disabled: !canMoveUp, onSelect: () => up.current?.requestSubmit() },
    { label: "Move down", icon: <ArrowDownIcon />, disabled: !canMoveDown, onSelect: () => down.current?.requestSubmit() },
    ...moveTargets.map((s, i) => ({
      label: `Move to “${s.name}”`,
      icon: <MoveToIcon />,
      separated: i === 0,
      onSelect: () => {
        if (target.current) target.current.value = s.id;
        moveTo.current?.requestSubmit();
      },
    })),
    { label: `Remove ${noun}`, icon: <TrashIcon />, destructive: true, onSelect: () => setConfirming(true) },
  ];

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <form ref={up} id={`${uid}-up`} action={move} hidden>
        {hidden}
        <input type="hidden" name="direction" value="up" />
      </form>
      <form ref={down} id={`${uid}-down`} action={move} hidden>
        {hidden}
        <input type="hidden" name="direction" value="down" />
      </form>
      {kind === "task" && moveTargets.length ? (
        <form ref={moveTo} action={moveTaskToSection} hidden>
          {hidden}
          <input ref={target} type="hidden" name="target_section_id" defaultValue="" />
        </form>
      ) : null}
      <form ref={remove} action={kind === "section" ? removeSection : removeTask} hidden>
        {hidden}
      </form>

      <span className="hidden items-center gap-0.5 opacity-0 transition-ui group-hover/item:opacity-100 group-focus-within/item:opacity-100 md:flex">
        <Button type="submit" form={`${uid}-up`} variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" disabled={!canMoveUp} aria-label={`Move ${noun} ${name} up`}>
          <ArrowUpIcon />
        </Button>
        <Button type="submit" form={`${uid}-down`} variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" disabled={!canMoveDown} aria-label={`Move ${noun} ${name} down`}>
          <ArrowDownIcon />
        </Button>
      </span>
      <ActionMenu label={`Actions for ${noun} ${name}`} items={items} />

      <ConfirmDialog
        open={confirming}
        title={name}
        description={CANNOT_BE_UNDONE}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          remove.current?.requestSubmit();
        }}
      />
    </div>
  );
}
