// Документи запуску (зріз 4, solomchaak/property-workflows-spec#59) на справжньому Postgres (PGlite) з усіма міграціями:
// хто зберігає й читає записи (менеджер запуску, адміністратор; підрядник і менеджер-виконавець — ні, навіть прямим
// запитом, AC-DOCAI-15, 16), що запис має тип, значення, автора й час (AC-DOCAI-04), і що прямого запису в таблицю немає.
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

const [TASK_1, , TASK_3, TASK_4] = TENANT_MOVE_IN.taskIds;

const errorOf = (p: Promise<unknown>) =>
  p.then(
    () => "",
    (e: Error) => e.message,
  );

type Doc = {
  kind?: string | null;
  phone?: string | null;
  description?: string | null;
  category?: string | null;
  urgency?: string | null;
  items?: unknown;
  total?: number | null;
};

const REQUEST: Doc = { kind: "request", phone: "555-0101", description: "The kitchen tap drips.", category: "plumbing", urgency: "urgent" };

const save = (userId: string, runId: string, doc: Doc) =>
  t.asUser(userId, "select public.save_run_document($1, $2, $3, $4, $5, $6, $7, $8)", [
    runId,
    doc.kind ?? null,
    doc.phone ?? null,
    doc.description ?? null,
    doc.category ?? null,
    doc.urgency ?? null,
    doc.items === undefined ? null : JSON.stringify(doc.items),
    doc.total ?? null,
  ]);

const stored = (runId: string) =>
  t.asService<Record<string, unknown>>(
    "select kind, phone, description, category, urgency, items, total::float8 as total, saved_by from public.run_documents where run_id = $1 order by saved_at desc, id",
    [runId],
  );

const visibleTo = (userId: string, runId: string) =>
  t.asUser<{ kind: string }>(userId, "select kind from public.run_documents where run_id = $1", [runId]);

/** «Apartment 12, move-in» менеджера A: задачі 3 і 4 — на підряднику V, задача 1 — на менеджері B. */
const runOfA = (caseName: string) => launch(t, MANAGER_A, caseName, { [TASK_1]: MANAGER_B, [TASK_3]: VENDOR_V, [TASK_4]: VENDOR_V });

describe("База: збереження підтверджених значень", () => {
  it("AC-DOCAI-04: менеджер запуску A зберігає один запис — тип, значення як підтвердив, автор A", async () => {
    const runId = await runOfA("Apartment 12, leak");
    await save(MANAGER_A, runId, REQUEST);
    expect(await stored(runId)).toEqual([{ ...REQUEST, items: null, total: null, saved_by: MANAGER_A }]);
    const [{ saved_at }] = await t.asService<{ saved_at: string }>("select saved_at from public.run_documents where run_id = $1", [runId]);
    expect(saved_at).toBeTruthy();
  });

  it("AC-DOCAI-13: адміністратор зберігає значення, введені вручну, у будь-якому запуску; записів може бути кілька", async () => {
    const runId = await runOfA("Apartment 14, estimate");
    await save(ADMIN, runId, { kind: "estimate", items: [{ name: "Labour", quantity: 2, unitPrice: 60 }], total: 120 });
    await save(MANAGER_A, runId, REQUEST);
    expect((await stored(runId)).map((r) => r.saved_by)).toEqual(expect.arrayContaining([ADMIN, MANAGER_A]));
    expect(await stored(runId)).toHaveLength(2);
  });

  it("AC-DOCAI-16: підрядник V і менеджер-виконавець B — DOCUMENT_NOT_ALLOWED, жодного запису", async () => {
    const runId = await runOfA("Apartment 12, move-in");
    for (const user of [VENDOR_V, MANAGER_B]) {
      expect(await errorOf(save(user, runId, REQUEST))).toContain("DOCUMENT_NOT_ALLOWED");
      expect(await errorOf(t.asUser(user, "select public.check_run_document($1)", [runId]))).toContain("DOCUMENT_NOT_ALLOWED");
    }
    expect(await stored(runId)).toEqual([]);
  });

  it("AC-DOCAI-16: прямий запис у таблицю заборонено всім, навіть менеджеру запуску", async () => {
    const runId = await runOfA("Apartment 15, direct");
    for (const user of [MANAGER_A, VENDOR_V]) {
      expect(
        await errorOf(
          t.asUser(user, "insert into public.run_documents (run_id, kind, phone, saved_by) values ($1, 'request', '555-0101', $2)", [runId, user]),
        ),
      ).toMatch(/permission denied/);
    }
  });

  it("AC-DOCAI-16: неіснуючий запуск: адміністратор — RUN_NOT_FOUND, менеджер — та сама відмова, що й для чужого", async () => {
    const missing = "00000000-0000-0000-0000-00000000dead";
    expect(await errorOf(save(ADMIN, missing, REQUEST))).toContain("RUN_NOT_FOUND");
    expect(await errorOf(save(MANAGER_A, missing, REQUEST))).toContain("DOCUMENT_NOT_ALLOWED");
  });

  it("AC-DOCAI-04: значення поза переліками, порожній запис і кривий список позицій — відмова, нічого не записано", async () => {
    const runId = await runOfA("Apartment 16, invalid");
    expect(await errorOf(save(MANAGER_A, runId, { kind: "request", category: "garden" }))).toContain("DOCUMENT_INVALID");
    expect(await errorOf(save(MANAGER_A, runId, { kind: "menu", phone: "555-0101" }))).toContain("DOCUMENT_INVALID");
    expect(await errorOf(save(MANAGER_A, runId, { kind: "request" }))).toContain("DOCUMENT_EMPTY");
    expect(await errorOf(save(MANAGER_A, runId, { kind: "estimate", items: [{}] }))).toContain("DOCUMENT_INVALID");
    // Позиція без назви (лише кількість і ціна) — теж відмова: перевірка типу поля через IS DISTINCT FROM, а не <>.
    expect(await errorOf(save(MANAGER_A, runId, { kind: "estimate", items: [{ quantity: 1, unitPrice: 1 }] }))).toContain("DOCUMENT_INVALID");
    expect(await errorOf(save(MANAGER_A, runId, { kind: "estimate", items: [{ name: "x", quantity: 0, unitPrice: 1 }] }))).toContain("DOCUMENT_INVALID");
    const many = Array.from({ length: 31 }, (_, i) => ({ name: `Item ${i + 1}`, quantity: 1, unitPrice: 1 }));
    expect(await errorOf(save(MANAGER_A, runId, { kind: "estimate", items: many }))).toContain("DOCUMENT_INVALID");
    expect(await stored(runId)).toEqual([]);
  });
});

describe("База: хто бачить записи", () => {
  it("AC-DOCAI-15, 16: менеджер запуску A й адміністратор бачать записи, менеджер B і підрядник V — ні", async () => {
    const runId = await runOfA("Apartment 17, visibility");
    await save(MANAGER_A, runId, REQUEST);
    expect(await visibleTo(MANAGER_A, runId)).toHaveLength(1);
    expect(await visibleTo(ADMIN, runId)).toHaveLength(1);
    expect(await visibleTo(MANAGER_B, runId)).toEqual([]);
    expect(await visibleTo(VENDOR_V, runId)).toEqual([]);
  });

  it("документів задач (#92) більше немає: таблиця й функції прибрані", async () => {
    const [{ exists }] = await t.asService<{ exists: boolean }>("select to_regclass('public.run_task_documents') is not null as exists");
    expect(exists).toBe(false);
    expect(await errorOf(t.asUser(MANAGER_A, "select public.check_task_document($1)", [TASK_1]))).toMatch(/does not exist/);
  });
});

describe("База: відгук викладача до WS10 — форма й база відхиляють те саме, ліміт AI на людину", () => {
  it("AC-DOCAI-04: назва з самого переносу рядка, зайвий ключ позиції і сума NaN — DOCUMENT_INVALID, нічого не записано", async () => {
    const runId = await runOfA("Apartment 12, invalid items");
    const bad = [
      { kind: "estimate", items: [{ name: "\n", quantity: 1, unitPrice: 1 }] },
      { kind: "estimate", items: [{ name: "\t \n", quantity: 1, unitPrice: 1 }] },
      { kind: "estimate", items: [{ name: "Faucet", quantity: 1, unitPrice: 1, note: "x".repeat(10_000) }] },
    ];
    for (const doc of bad) expect(await errorOf(save(MANAGER_A, runId, doc))).toContain("DOCUMENT_INVALID");
    const nan = t.asUser(MANAGER_A, "select public.save_run_document($1, 'estimate', null, null, null, null, null, 'NaN'::numeric)", [runId]);
    expect(await errorOf(nan)).toContain("DOCUMENT_INVALID");
    expect(await stored(runId)).toEqual([]);
  });

  it("AC-DOCAI-04: назва з пробілами на краях і 120 символів без них — приймається, як у формі", async () => {
    const runId = await runOfA("Apartment 12, trimmed name");
    await save(MANAGER_A, runId, { kind: "estimate", items: [{ name: ` ${"a".repeat(120)}\n`, quantity: 1, unitPrice: 1 }] });
    expect(await stored(runId)).toHaveLength(1);
  });

  it("AC-DOCAI-13: ліміт на людину — 10 викликів на добу, 11-й DAILY_LIMIT; лічильник іншого користувача окремий", async () => {
    const calls = async (userId: string, n: number) => {
      const out: string[] = [];
      for (let i = 0; i < n; i++) out.push(await errorOf(t.asUser(userId, "select public.consume_ai_quota()")));
      return out;
    };
    const first = await calls(MANAGER_A, 11);
    expect(first.slice(0, 10)).toEqual(Array(10).fill(""));
    expect(first[10]).toContain("DAILY_LIMIT");
    expect(await calls(ADMIN, 1)).toEqual([""]);
    const own = await t.asUser<{ count: number }>(MANAGER_A, "select count from public.ai_usage");
    expect(own).toEqual([{ count: 10 }]);
  });

  it("AC-DOCAI-16: лічильник ліміту не змінити напряму й не прочитати чужий; без входу функції немає", async () => {
    await t.asUser(MANAGER_B, "select public.consume_ai_quota()");
    expect(await t.asUser(VENDOR_V, "select user_id from public.ai_usage")).toEqual([]);
    expect(await errorOf(t.asUser(MANAGER_B, "update public.ai_usage set count = 0"))).toMatch(/permission denied/);
    expect(await errorOf(t.asUser(MANAGER_B, "delete from public.ai_usage"))).toMatch(/permission denied/);
    expect(await errorOf(t.asAnon("select public.consume_ai_quota()"))).toMatch(/permission denied/);
    expect(await errorOf(t.asAuthenticatedWithoutUid("select public.consume_ai_quota()"))).toContain("NOT_ALLOWED");
  });
});
