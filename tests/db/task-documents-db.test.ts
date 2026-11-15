// Значення документа задачі (зріз 4 «AI document parsing», ADR 0008) на справжньому Postgres (PGlite) з усіма
// міграціями: хто зберігає, у якому статусі, які значення база приймає, хто їх бачить, і що прямого запису в таблицю
// немає. Вимоги зрізу 4 з AC у PM ще немає (golden cases — solomchaak/property-workflows-spec#40), тож назви тестів —
// без AC ID; права — ті самі, що в позначки задачі (complete_task).
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, launch, TENANT_MOVE_IN, type TestDb } from "./supabase-pglite";

let t: TestDb;
let ADMIN: string, MANAGER_A: string, MANAGER_B: string, VENDOR_V: string;

beforeAll(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_A = t.users["manager.a@example.test"];
  MANAGER_B = t.users["manager.b@example.test"];
  VENDOR_V = t.users["vendor.v@example.test"];
}, 60_000);

// «Tenant move-in»: 1, 2 і 4 обов'язкові, 3 і 5 — ні.
const [TASK_1, TASK_2, TASK_3, TASK_4] = TENANT_MOVE_IN.taskIds;

const errorOf = (p: Promise<unknown>) =>
  p.then(
    () => "",
    (e: Error) => e.message,
  );

const taskOf = async (runId: string, templateTaskId: string) =>
  (
    await t.asService<{ id: string }>("select id from public.run_tasks where run_id = $1 and template_task_id = $2", [
      runId,
      templateTaskId,
    ])
  )[0].id;

type Doc = {
  kind?: string | null;
  phone?: string | null;
  description?: string | null;
  category?: string | null;
  urgency?: string | null;
  items?: unknown;
  total?: number | null;
};

const REQUEST: Doc = { kind: "request", phone: "555-0101", description: "Water is leaking under the kitchen sink.", category: "plumbing", urgency: "urgent" };

const save = (userId: string, taskId: string, doc: Doc) =>
  t.asUser(userId, "select public.save_task_document($1, $2, $3, $4, $5, $6, $7, $8)", [
    taskId,
    doc.kind ?? null,
    doc.phone ?? null,
    doc.description ?? null,
    doc.category ?? null,
    doc.urgency ?? null,
    doc.items === undefined ? null : JSON.stringify(doc.items),
    doc.total ?? null,
  ]);

const stored = (taskId: string) =>
  t.asService<Record<string, unknown>>(
    "select kind, phone, description, category, urgency, items, total::float8 as total, saved_by from public.run_task_documents where task_id = $1",
    [taskId],
  );

/** Запуск менеджера A, де задачі 3 і 4 — на підряднику V. */
const runWithVendor = (caseName: string) => launch(t, MANAGER_A, caseName, { [TASK_3]: VENDOR_V, [TASK_4]: VENDOR_V });

describe("База: хто зберігає значення документа", () => {
  it("виконавець зберігає значення, які підтвердив; save_by — він", async () => {
    const runId = await runWithVendor("Flat 1, leak");
    const task = await taskOf(runId, TASK_1);
    await save(MANAGER_A, task, REQUEST);
    expect(await stored(task)).toEqual([{ ...REQUEST, items: null, total: null, saved_by: MANAGER_A }]);
  });

  it("повторне збереження замінює значення, а не додає другий документ", async () => {
    const runId = await runWithVendor("Flat 2, leak");
    const task = await taskOf(runId, TASK_1);
    await save(MANAGER_A, task, REQUEST);
    await save(ADMIN, task, { kind: "request", description: "No hot water in the bathroom.", category: "plumbing", urgency: "not_urgent" });
    const rows = await stored(task);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ phone: null, urgency: "not_urgent", saved_by: ADMIN });
  });

  it("підрядник зберігає на своїй задачі, а на чужій — NOT_ALLOWED і нічого не записано", async () => {
    const runId = await runWithVendor("Flat 3, estimate");
    const own = await taskOf(runId, TASK_3);
    const foreign = await taskOf(runId, TASK_1);
    await save(VENDOR_V, own, { kind: "estimate", items: [{ name: "Faucet", quantity: 1, unitPrice: 85 }], total: 85 });
    expect(await stored(own)).toEqual([
      { kind: "estimate", phone: null, description: null, category: null, urgency: null, items: [{ name: "Faucet", quantity: 1, unitPrice: 85 }], total: 85, saved_by: VENDOR_V },
    ]);
    expect(await errorOf(save(VENDOR_V, foreign, REQUEST))).toContain("NOT_ALLOWED");
    expect(await stored(foreign)).toEqual([]);
  });

  it("менеджер чужого запуску — NOT_ALLOWED і нічого не записано; адміністратор — може", async () => {
    const runId = await runWithVendor("Flat 4, leak");
    const task = await taskOf(runId, TASK_2);
    expect(await errorOf(save(MANAGER_B, task, REQUEST))).toContain("NOT_ALLOWED");
    expect(await stored(task)).toEqual([]);
    await save(ADMIN, task, REQUEST);
    expect(await stored(task)).toHaveLength(1);
  });

  it("перевірка до виклику моделі: та сама відповідь, що й запис, і нічого не пише", async () => {
    const runId = await runWithVendor("Flat 5, check");
    const task = await taskOf(runId, TASK_1);
    expect(await t.asUser(MANAGER_A, "select public.check_task_document($1) as ok", [task])).toEqual([{ ok: true }]);
    expect(await errorOf(t.asUser(MANAGER_B, "select public.check_task_document($1)", [task]))).toContain("NOT_ALLOWED");
    expect(await errorOf(t.asUser(VENDOR_V, "select public.check_task_document($1)", [task]))).toContain("NOT_ALLOWED");
    expect(await errorOf(t.asUser(MANAGER_A, "select public.check_task_document($1)", ["00000000-0000-0000-0000-000000000000"]))).toContain(
      "TASK_NOT_FOUND",
    );
    expect(await stored(task)).toEqual([]);
  });

  it("без входу функції недоступні, а прямий запис у таблицю заборонено навіть виконавцю", async () => {
    const runId = await runWithVendor("Flat 6, direct");
    const task = await taskOf(runId, TASK_1);
    expect(await errorOf(t.asAnon("select public.check_task_document($1)", [task]))).toMatch(/permission denied/);
    expect(await errorOf(t.asAuthenticatedWithoutUid("select public.check_task_document($1)", [task]))).toContain("NOT_ALLOWED");
    expect(
      await errorOf(
        t.asUser(MANAGER_A, "insert into public.run_task_documents (task_id, kind, phone, saved_by) values ($1, 'request', '555-0101', $2)", [
          task,
          MANAGER_A,
        ]),
      ),
    ).toMatch(/permission denied/);
    expect(await stored(task)).toEqual([]);
  });
});

describe("База: значення виконаної задачі не змінюються", () => {
  it("задача «done» — TASK_DONE, збережені раніше значення лишаються як були", async () => {
    const runId = await runWithVendor("Flat 7, done");
    const task = await taskOf(runId, TASK_1);
    await save(MANAGER_A, task, REQUEST);
    await t.asUser(MANAGER_A, "select * from public.complete_task($1, false)", [task]);
    expect(await errorOf(save(MANAGER_A, task, { kind: "request", description: "Changed later." }))).toContain("TASK_DONE");
    expect(await errorOf(t.asUser(MANAGER_A, "select public.check_task_document($1)", [task]))).toContain("TASK_DONE");
    expect((await stored(task))[0]).toMatchObject({ description: REQUEST.description });
  });

  it("запуск «completed» — RUN_COMPLETED навіть для необов'язкової задачі «to do»", async () => {
    const runId = await launch(t, MANAGER_A, "Flat 8, completed");
    for (const id of [TASK_1, TASK_2, TASK_4]) {
      await t.asUser(MANAGER_A, "select * from public.complete_task($1, true)", [await taskOf(runId, id)]);
    }
    const optional = await taskOf(runId, TASK_3);
    expect(await errorOf(save(MANAGER_A, optional, REQUEST))).toContain("RUN_COMPLETED");
    expect(await stored(optional)).toEqual([]);
  });
});

describe("База: які значення приймає", () => {
  it.each([
    ["категорія поза переліком", { ...REQUEST, category: "dragons" }],
    ["телефон не у формі 555-0101", { ...REQUEST, phone: "555 01 01" }],
    ["вид документа поза переліком", { ...REQUEST, kind: "menu" }],
    ["без виду документа", { ...REQUEST, kind: null }],
    ["опис довший за 400 символів", { ...REQUEST, description: "x".repeat(401) }],
    ["від'ємна сума", { kind: "estimate", total: -1 }],
    ["позиція без назви", { kind: "estimate", items: [{ name: " ", quantity: 1, unitPrice: 10 }] }],
    ["кількість 0", { kind: "estimate", items: [{ name: "Faucet", quantity: 0, unitPrice: 10 }] }],
    ["ціна текстом", { kind: "estimate", items: [{ name: "Faucet", quantity: 1, unitPrice: "10" }] }],
    ["позиції не списком", { kind: "estimate", items: { name: "Faucet" } }],
    ["понад 30 позицій", { kind: "estimate", items: Array.from({ length: 31 }, () => ({ name: "Bolt", quantity: 1, unitPrice: 1 })) }],
  ])("%s — DOCUMENT_INVALID, нічого не записано", async (_label, doc) => {
    const runId = await runWithVendor(`Flat 9, invalid ${_label}`.slice(0, 100));
    const task = await taskOf(runId, TASK_1);
    expect(await errorOf(save(MANAGER_A, task, doc as Doc))).toContain("DOCUMENT_INVALID");
    expect(await stored(task)).toEqual([]);
  });

  it("жодного значення (порожній список позицій теж) — DOCUMENT_EMPTY", async () => {
    const runId = await runWithVendor("Flat 10, empty");
    const task = await taskOf(runId, TASK_1);
    expect(await errorOf(save(MANAGER_A, task, { kind: "estimate", items: [] }))).toContain("DOCUMENT_EMPTY");
    expect(await stored(task)).toEqual([]);
  });
});

describe("База: хто бачить значення", () => {
  it("виконавець, менеджер запуску й адміністратор бачать; підрядник — лише своєї задачі; сторонній менеджер — нічого", async () => {
    const runId = await runWithVendor("Flat 11, visibility");
    const managerTask = await taskOf(runId, TASK_1);
    const vendorTask = await taskOf(runId, TASK_3);
    await save(MANAGER_A, managerTask, REQUEST);
    await save(VENDOR_V, vendorTask, { kind: "estimate", total: 120 });
    const visible = (userId: string) =>
      t
        .asUser<{ task_id: string }>(userId, "select task_id from public.run_task_documents where task_id = any($1::uuid[])", [[managerTask, vendorTask]])
        .then((rows) => rows.map((r) => r.task_id).sort());
    expect(await visible(MANAGER_A)).toEqual([managerTask, vendorTask].sort());
    expect(await visible(ADMIN)).toEqual([managerTask, vendorTask].sort());
    expect(await visible(VENDOR_V)).toEqual([vendorTask]);
    expect(await visible(MANAGER_B)).toEqual([]);
  });
});
