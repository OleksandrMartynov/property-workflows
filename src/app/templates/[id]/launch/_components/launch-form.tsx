"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LogoMark } from "@/components/ui/logo";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Select } from "@/components/ui/select";
import { assigneeField } from "@/lib/runs/assignees";
import { CASE_NAME_MAX_LENGTH } from "@/lib/runs/messages";
import { cn } from "@/lib/utils";
import { SubmitButton } from "../../../../_components/submit-button";

export interface LaunchSection {
  id: string;
  name: string;
}
export interface LaunchTask {
  id: string;
  section_id: string;
  name: string;
  required: boolean;
}
export interface Assignee {
  id: string;
  email: string | null;
}

interface Person {
  id: string;
  name: string;
  me: boolean;
}

function PersonLabel({ person }: { person: Person }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar email={person.name} />
      <span className="min-w-0 break-all">{person.me ? "Me" : person.name}</span>
      {person.me ? <span className="shrink-0 text-meta text-muted-foreground">run manager</span> : null}
    </span>
  );
}

/**
 * Форма запуску: назва випадку, виконавець кожної задачі (за замовчуванням — той, хто запускає, він же менеджер
 * запуску) і живе превʼю запуску праворуч: назва, склад, хто що робить. ⌘/Ctrl + Enter запускає.
 */
export function LaunchForm({
  templateId,
  templateName,
  sections,
  tasks,
  viewer,
  others,
  caseName: initialName,
  action,
}: {
  templateId: string;
  templateName: string;
  sections: LaunchSection[];
  tasks: LaunchTask[];
  viewer: { id: string; email: string | null };
  others: Assignee[];
  caseName: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const people = useMemo<Person[]>(
    () => [{ id: viewer.id, name: viewer.email ?? "me", me: true }, ...others.map((u) => ({ id: u.id, name: u.email ?? u.id, me: false }))],
    [viewer, others],
  );
  const [caseName, setCaseName] = useState(initialName);
  const [assignment, setAssignment] = useState<Record<string, string>>(() => Object.fromEntries(tasks.map((t) => [t.id, viewer.id])));

  const requiredCount = tasks.filter((t) => t.required).length;
  const perPerson = people
    .map((person) => ({ person, count: tasks.filter((t) => assignment[t.id] === person.id).length }))
    .filter((entry) => entry.count > 0);
  const nameLength = caseName.trim().length;
  const title = caseName.trim();

  const assignAll = (id: string) => id && setAssignment(Object.fromEntries(tasks.map((t) => [t.id, id])));
  const personOptions = people.map((p) => ({
    value: p.id,
    label: p.name,
    avatar: p.name,
    trailing: p.me ? <span className="text-meta text-muted-foreground">run manager</span> : undefined,
  }));

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  };

  return (
    <form action={action} noValidate onKeyDown={onKeyDown} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <input type="hidden" name="template_id" value={templateId} />

      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <Field
              id="case_name"
              label="Case name"
              hint={
                <span className={cn("tabular flex justify-end", nameLength > CASE_NAME_MAX_LENGTH && "text-destructive")}>
                  {nameLength}/{CASE_NAME_MAX_LENGTH}
                </span>
              }
            >
              <Input
                id="case_name"
                name="case_name"
                size="xl"
                placeholder="Apartment 12, move-in"
                value={caseName}
                onChange={(event) => setCaseName(event.target.value)}
                autoComplete="off"
                aria-describedby="case_name-hint"
              />
            </Field>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3" aria-labelledby="assign-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex flex-col">
              <h2 id="assign-heading" className="text-heading">
                Who does what
              </h2>
            </div>
            <div className="w-full sm:w-56">
              <Select value="" onValueChange={assignAll} placeholder="Assign all to…" options={personOptions} aria-label="Assign all tasks to" />
            </div>
          </div>

          {sections.map((section) => {
            const sectionTasks = tasks.filter((t) => t.section_id === section.id);
            const sectionRequired = sectionTasks.filter((t) => t.required).length;
            return (
              <fieldset key={section.id} className="rounded-md border border-border bg-card shadow-sm">
                <legend className="float-left w-full border-b border-border px-4 py-2.5">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-heading">{section.name}</span>
                    <span className="tabular text-meta text-muted-foreground">
                      {sectionTasks.length} tasks · {sectionRequired} required
                    </span>
                  </span>
                </legend>
                <ul className="clear-both flex flex-col divide-y divide-border">
                  {sectionTasks.map((task, index) => (
                    <li key={task.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 transition-ui first:rounded-t-none hover:bg-state-hover">
                      <span className="tabular w-4 shrink-0 text-meta text-muted-foreground">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        {task.name}
                        <Badge variant="outline" className="ml-2 align-middle">
                          {task.required ? "required" : "optional"}
                        </Badge>
                      </span>
                      <div className="w-full sm:w-80">
                        <Combobox
                          name={assigneeField(task.id)}
                          value={assignment[task.id]}
                          onValueChange={(id) => id && setAssignment((prev) => ({ ...prev, [task.id]: id }))}
                          options={personOptions}
                          clearable={false}
                          aria-label={`Assignee of ${task.name}`}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </fieldset>
            );
          })}
        </section>

        <div className="lg:hidden">
          <SubmitButton pendingText="Launching…" size="lg" className="w-full">
            Launch
          </SubmitButton>
        </div>
      </div>

      <Card className="flex flex-col gap-4 p-4 lg:sticky lg:top-6">
        <div className="flex items-center gap-2 text-label text-muted-foreground">
          <LogoMark className="size-4 text-primary" />
          Run preview
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className={cn("text-title break-words", !title && "text-muted-foreground")}>{title || "Untitled case"}</p>
          <p className="text-body text-muted-foreground">{templateName}</p>
        </div>

        <div className="flex items-center gap-2.5 rounded-md bg-muted/60 px-3 py-2.5">
          <ProgressRing done={0} total={tasks.length} className="size-5" />
          <span className="tabular text-body">
            0 of {tasks.length} done
          </span>
          <span className="tabular ml-auto text-meta text-muted-foreground">
            {sections.length} sections · {requiredCount} required
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-label font-medium">Who does what</p>
          <ul className="flex flex-col gap-2">
            {perPerson.map(({ person, count }) => (
              <li key={person.id} className="animate-ui-rise flex flex-col gap-1">
                <span className="flex items-center justify-between gap-3 text-body">
                  <PersonLabel person={person} />
                  <span className="tabular shrink-0 text-muted-foreground">
                    {count} {count === 1 ? "task" : "tasks"}
                  </span>
                </span>
                <span aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary transition-[width] duration-(--duration-slow) ease-in-out-soft"
                    style={{ width: `${(count / Math.max(tasks.length, 1)) * 100}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden flex-col gap-2 lg:flex">
          <SubmitButton pendingText="Launching…" size="lg" className="w-full">
            Launch
          </SubmitButton>
        </div>
      </Card>
    </form>
  );
}

