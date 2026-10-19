import { describe, expect, it } from "vitest";
import { assigneeField, collectAssignees } from "@/lib/runs/assignees";

const TASKS = ["t1", "t2", "t3", "t4", "t5"];
const A = "manager-a";
const B = "manager-b";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

describe("Виконавці з форми запуску", () => {
  it("AC-RUN-04: дві задачі на менеджера B — у функцію бази йдуть лише ці дві", () => {
    const data = form({ [assigneeField("t1")]: B, [assigneeField("t2")]: B, [assigneeField("t3")]: A });
    expect(collectAssignees(data, TASKS, A)).toEqual({ t1: B, t2: B });
  });

  it("AC-RUN-08: без призначень — порожньо, усі задачі лишаються на менеджері запуску", () => {
    expect(collectAssignees(form({}), TASKS, A)).toEqual({});
  });

  it("AC-RUN-09: адміністратор обрав себе для всіх задач — порожньо, усе на ньому", () => {
    const data = form(Object.fromEntries(TASKS.map((id) => [assigneeField(id), "admin"])));
    expect(collectAssignees(data, TASKS, "admin")).toEqual({});
  });
});
