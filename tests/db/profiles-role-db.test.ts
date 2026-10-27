// Пастка «update own row + колонка role» (міграція 20261012000000_profiles_and_roles.sql, матриця прав у
// requirements/product.md: роль призначає лише адміністратор і лише іншому користувачу, власну роль змінити не можна).
// Політика profiles_update_own дозволяє оновити свій рядок, тож роль захищає лише колонковий grant update (full_name).
// Кожен відмовний тест перевіряє і відмову, і те, що роль у базі та сама (asService — в обхід RLS).
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
let ADMIN: string, MANAGER_A: string, MANAGER_B: string;

beforeAll(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_A = t.users["manager.a@example.test"];
  MANAGER_B = t.users["manager.b@example.test"];
}, 60_000);

const profile = async (id: string) =>
  (await t.asService<{ role: string; full_name: string | null }>("select role, full_name from public.profiles where id = $1", [id]))[0];

describe("База: роль у profiles не змінює сам користувач", () => {
  it("менеджер оновлює свій рядок і ставить собі role = 'admin' — permission denied, роль та сама", async () => {
    await expect(t.asUser(MANAGER_A, "update public.profiles set role = 'admin' where id = $1", [MANAGER_A])).rejects.toThrow(
      "permission denied",
    );
    // Разом із дозволеною колонкою — теж відмова, і full_name теж не змінився.
    const before = await profile(MANAGER_A);
    await expect(
      t.asUser(MANAGER_A, "update public.profiles set full_name = 'Escalated', role = 'admin' where id = $1", [MANAGER_A]),
    ).rejects.toThrow("permission denied");
    expect(await profile(MANAGER_A)).toEqual({ ...before, role: "manager" });
  });

  it("адміністратор не змінює власну роль напряму — permission denied, роль та сама", async () => {
    await expect(t.asUser(ADMIN, "update public.profiles set role = 'manager' where id = $1", [ADMIN])).rejects.toThrow(
      "permission denied",
    );
    expect((await profile(ADMIN)).role).toBe("admin");
  });

  it("контроль: свій full_name менеджер змінює (відмова вище — саме через колонку role), чужий рядок — ні", async () => {
    await t.asUser(MANAGER_A, "update public.profiles set full_name = 'Manager A (renamed)' where id = $1", [MANAGER_A]);
    expect(await profile(MANAGER_A)).toEqual({ role: "manager", full_name: "Manager A (renamed)" });

    const other = await profile(MANAGER_B);
    const changed = await t.asUser(MANAGER_A, "update public.profiles set full_name = 'Hijacked' where id = $1 returning id", [MANAGER_B]);
    expect(changed).toHaveLength(0);
    expect(await profile(MANAGER_B)).toEqual(other);
  });

  it("відвідувач без входу (anon) не змінює профілі — permission denied, роль та сама", async () => {
    await expect(t.asAnon("update public.profiles set role = 'admin' where id = $1", [MANAGER_B])).rejects.toThrow("permission denied");
    expect((await profile(MANAGER_B)).role).toBe("manager");
  });
});
