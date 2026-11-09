// Вхід кожної ролі один раз за прогін → playwright/.auth/<role>.json (у .gitignore: там живі cookie сесії).
// Тести ролей беруть стан через test.use({ storageState: "playwright/.auth/<role>.json" }).
// У цьому проєкті запис вимкнено (playwright.config.ts: setup — video, trace і screenshot "off"): тут вводиться пароль.
//
// Змінні з паролями (лише назви; значення — у .env.local локально або в secrets CI, ніколи в коді):
//   DEMO_USER_PASSWORD           — спільний пароль акаунтів із supabase/demo-users.json (npm run users:demo);
//   UAT_PASSWORD_<РОЛЬ>          — необов'язково: окремий пароль для ролі, напр. UAT_PASSWORD_ADMIN.
//
// Джерело: демо-репо курсу, tests/e2e/auth.setup.ts (тег ws8-03-uat). ROLES — ВАШІ: роль → адреса акаунта на проді
// (D0.5, *@example.test). Нижче — акаунти шаблону курсу.
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test as setup } from "@playwright/test";
import { adminClient, hasAdminKey, randomPassword, uatEmail } from "./support/admin";
import { signIn } from "./support/uat";
import {
  PEOPLE,
  clientWithPassword,
  currentTemplateTasks,
  launchTenantMoveIn,
  statePath,
  writeFixturePath,
  type Person,
  type VendorFixture,
} from "./support/vendor";

// AC-EDITOR-07 — менеджер B із запусками; AC-DSYS-04 — менеджер без жодного запуску (окремий акаунт, щоб стан не
// залежав від того, що PM чи UAT запускали на проді).
const ROLES = {
  manager: "manager.b@example.test",
  managerEmpty: "manager.d@example.test",
  // Адміністратор — лише щоб перевірити передумову «Дано» (наприклад, версії шаблону для AC-EDITOR-07); нічого не змінює.
  admin: "admin@example.test",
} as const;

for (const [role, email] of Object.entries(ROLES)) {
  setup(`вхід: ${role}`, async ({ page }) => {
    const password = process.env[`UAT_PASSWORD_${role.toUpperCase()}`] ?? process.env.DEMO_USER_PASSWORD;
    expect(password, `немає пароля для ролі ${role}: DEMO_USER_PASSWORD або UAT_PASSWORD_${role.toUpperCase()}`).toBeTruthy();
    await signIn(page, email, password!);
    // Головна шаблону показує email того, хто увійшов (data-testid="user-email"). Інша головна — свій локатор.
    await expect(page.getByTestId("user-email")).toHaveText(email);
    await page.context().storageState({ path: `playwright/.auth/${role}.json` });
  });
}

// ── Зріз 3: синтетичний менеджер A і підрядники V та запуски-передумови «Дано» (AC-VENDOR-01…10) ───────────────
// Пише на проді, тож лише з секретним ключем (.env.local): акаунти uat-<run>-…@example.test з випадковими паролями (живуть
// лише в пам'яті цього кроку), вхід кожного → playwright/.auth/uat-<хто>.json, запуски «Tenant move-in» від імені A.
// Без ключа кроку немає, і специфікації зрізу 3 падають з поясненням (readFixture у tests/e2e/support/vendor.ts).
if (hasAdminKey()) {
  setup("синтетичні учасники й запуски зрізу 3 (uat-*@example.test)", async ({ browser }) => {
    const admin = adminClient();
    const emails = {} as Record<Person, string>;
    const ids = {} as Record<Person, string>;
    const passwords = {} as Record<Person, string>;

    for (const [person, { role }] of Object.entries(PEOPLE) as [Person, { role: string }][]) {
      const email = uatEmail(person.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
      const password = randomPassword();
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      expect(error, `створення ${email}`).toBeNull();
      // Роль — у profiles (рядок створює тригер on_auth_user_created з найменшою роллю), ніколи не в user_metadata.
      const { error: roleError } = await admin.from("profiles").update({ role }).eq("id", data.user!.id);
      expect(roleError, `роль ${role} для ${email}`).toBeNull();
      emails[person] = email;
      ids[person] = data.user!.id;
      passwords[person] = password;

      const context = await browser.newContext();
      const page = await context.newPage();
      await signIn(page, email, password);
      await expect(page.getByTestId("user-email")).toHaveText(email);
      await context.storageState({ path: statePath(person) });
      await context.close();
    }

    // Запуски-передумови від імені менеджера A: задачі 3 і 4 — на підряднику, решта — на A (як у «Дано» PM).
    const managerA = await clientWithPassword(emails.manager, passwords.manager);
    const tasks = await currentTemplateTasks(managerA);
    // «Дано» AC-VENDOR-01, 04: «Tenant move-in» з 5 задачами (npm run template:ac приводить шаблон до форми з AC).
    expect(tasks, "у «Tenant move-in» на проді має бути рівно 5 задач").toHaveLength(5);
    const toVendor = (person: Person) => ({ [tasks[2].template_task_id]: ids[person], [tasks[3].template_task_id]: ids[person] });
    const runs = {
      apartment12: await launchTenantMoveIn(managerA, "Apartment 12, move-in", toVendor("vendor")),
      apartment14: await launchTenantMoveIn(managerA, "Apartment 14, repair", {}),
    };
    // AC-VENDOR-05 змінює стан, тож свій запуск створює кожне його виконання (tests/e2e/vendor.spec.ts).

    mkdirSync("playwright/.auth", { recursive: true });
    const fixture: VendorFixture = { emails, ids, tasks, runs };
    writeFileSync(writeFixturePath, JSON.stringify(fixture, null, 2));
  });
}
