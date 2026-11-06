// AC-EDITOR-09 — відмова, яку видно в браузері (не увійшов). Лише читання: безпечно на проді.
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

// Відвідувач без входу: жодного збереженого стану сесії.
test.use({ storageState: { cookies: [], origins: [] } });

const TENANT_MOVE_IN = "10000000-0000-0000-0000-000000000001";
// Назви шаблонів, секцій і задач з insert-ів початкових даних — те саме джерело, що tests/design/hero-copy.test.tsx:
// новий витік вмісту шаблону (як колись у hero) тест зловить сам.
const SEED = readFileSync("supabase/migrations/20261019174350_run_launch.sql", "utf8");
const SEED_NAMES = [...SEED.matchAll(/\('[0-9a-f-]{36}',\s*(?:'[0-9a-f-]{36}',\s*)?'([^']+)'/g)].map((m) => m[1]);

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-EDITOR-09: відвідувач без входу за прямим посиланням на редактор «Tenant move-in» бачить сторінку входу без вмісту шаблону",
  { tag: ["@uat"], annotation: { type: "ac", description: "AC-EDITOR-09" } },
  async ({ page }) => {
    await given("відвідувач не увійшов", async () => {
      expect(await page.context().cookies()).toEqual([]);
    });

    await when("відвідувач відкриває редактор шаблону «Tenant move-in» за прямим посиланням", async () => {
      await page.goto(`/templates/${TENANT_MOVE_IN}/edit`);
    });

    await thenStep(
      page,
      {
        clause: "the visitor sees the sign-in page and no content of the template.",
        visible: ["сторінка входу: заголовок «Sign in», поля «Email» і «Password», кнопка «Sign in»"],
        hidden: ["жодного вмісту шаблону: немає назви «Tenant move-in», секцій і задач шаблону; адреса — /login"],
      },
      async () => {
        await expect(page).toHaveURL((url) => url.pathname === "/login");
        await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
        await expect(page.getByLabel("Email")).toBeVisible();
        await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
        expect(SEED_NAMES).toEqual(expect.arrayContaining(["Tenant move-in", "Before move-in", "Move-in day", "Order cleaning"]));
        for (const text of SEED_NAMES) {
          await expect(page.getByText(text, { exact: false })).toHaveCount(0);
        }
      },
    );
  },
);
