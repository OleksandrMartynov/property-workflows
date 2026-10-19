// Хто бачить які запуски (RLS runs і run_tasks через private.can_see_run) і прогрес у списку запусків —
// на справжньому Postgres (PGlite) з усіма міграціями. Специфікація: openspec/specs/run-progress/spec.md.
import { beforeAll, describe, expect, it } from "vitest";
import { formatProgress } from "@/lib/runs/progress";
import { createTestDb, launch, TENANT_MOVE_IN, type TestDb } from "./supabase-pglite";

let t: TestDb;
let ADMIN: string, MANAGER_A: string, MANAGER_B: string, MANAGER_C: string;

beforeAll(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_A = t.users["manager.a@example.test"];
  MANAGER_B = t.users["manager.b@example.test"];
  MANAGER_C = t.users["manager.c@example.test"];
}, 60_000);

/** Так читає список сторінка /runs: від імені користувача, під RLS. */
const visibleRunIds = async (userId: string) =>
  (await t.asUser<{ id: string }>(userId, "select id from public.runs order by created_at")).map((r) => r.id);

describe("База: список запусків", () => {
  it("AC-TASK-06: два запуски менеджера A, один — менеджера B, B — виконавець задачі першого запуску A: B бачить 2 запуски", async () => {
    const firstOfA = await launch(t, MANAGER_A, "Apartment 40, move-in", { [TENANT_MOVE_IN.taskIds[2]]: MANAGER_B });
    const secondOfA = await launch(t, MANAGER_A, "Apartment 41, move-in");
    const ofB = await launch(t, MANAGER_B, "Apartment 42, move-in");

    const seenByB = await visibleRunIds(MANAGER_B);
    expect(seenByB).toHaveLength(2);
    expect(seenByB).toEqual(expect.arrayContaining([ofB, firstOfA]));
    expect(seenByB).not.toContain(secondOfA);
    // AC-TASK-09: виконавець B бачить і прогрес запуску A, де він виконавець (view run_progress під RLS).
    const [{ total }] = await t.asUser<{ total: number }>(MANAGER_B, "select total from public.run_progress where run_id = $1", [firstOfA]);
    expect(total).toBe(5);

    // Задачі другого запуску A менеджер B теж не читає.
    const [{ n }] = await t.asUser<{ n: number }>(MANAGER_B, "select count(*)::int as n from public.run_tasks where run_id = $1", [secondOfA]);
    expect(n).toBe(0);
  });

  it("AC-TASK-06: менеджер C без запусків і задач не бачить жодного; адміністратор бачить усі", async () => {
    expect(await visibleRunIds(MANAGER_C)).toEqual([]);
    const [{ n: all }] = await t.asService<{ n: number }>("select count(*)::int as n from public.runs");
    expect(await visibleRunIds(ADMIN)).toHaveLength(all);
  });

  it("AC-TASK-09: запуск менеджера A з 5 задачами, 2 «done» — у списку A прогрес «2 of 5 done» (view run_progress)", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 43, move-in");
    const tasks = await t.asService<{ id: string }>(
      "select id from public.run_tasks where run_id = $1 order by section_position, position",
      [runId],
    );
    await t.asUser(MANAGER_A, "select public.complete_task($1)", [tasks[0].id]);
    await t.asUser(MANAGER_A, "select public.complete_task($1)", [tasks[3].id]);

    expect(await visibleRunIds(MANAGER_A)).toContain(runId);
    // Так читає прогрес сторінка /runs: один рядок на запуск, порахований базою.
    const [row] = await t.asUser<{ done: number; total: number }>(
      MANAGER_A,
      "select done, total from public.run_progress where run_id = $1",
      [runId],
    );
    expect(formatProgress(row)).toBe("2 of 5 done");
  });

  it("AC-TASK-09: прогрес чужого запуску view не віддає — діє RLS run_tasks (security_invoker)", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 44, move-in");
    expect(await t.asUser(MANAGER_C, "select * from public.run_progress where run_id = $1", [runId])).toEqual([]);
    await expect(t.asAnon("select * from public.run_progress")).rejects.toThrow("permission denied");
  });
});
