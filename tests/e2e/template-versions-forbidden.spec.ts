// AC-EDITOR-07 — відмова, яку видно в браузері (заборонена роль). Лише читання: безпечно на проді.
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

test.use({ storageState: "playwright/.auth/manager.json" });

// «Tenant move-in» — шаблон із початкових даних (міграція 20261019174350_run_launch.sql), той самий id на проді.
const TENANT_MOVE_IN = "10000000-0000-0000-0000-000000000001";
const MANAGER_B = "manager.b@example.test";

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-EDITOR-07: менеджер B за прямим посиланням на список версій «Tenant move-in» бачить «Not enough rights» і жодної версії",
  { tag: ["@uat"], annotation: { type: "ac", description: "AC-EDITOR-07" } },
  async ({ page }) => {
    await given("менеджер B увійшов, шаблон «Tenant move-in» має збережені версії", async () => {
      await page.goto("/runs");
      await expect(page.getByTestId("user-email")).toHaveText(MANAGER_B);
    });

    await when("B відкриває список версій цього шаблону за прямим посиланням", async () => {
      await page.goto(`/templates/${TENANT_MOVE_IN}/versions`);
    });

    await thenStep(
      page,
      {
        clause: 'B sees the message "Not enough rights" and no versions.',
        visible: ["повідомлення «Not enough rights»"],
        hidden: ["жодної версії: немає рядків «Version N», таблиці чи списку версій"],
      },
      async () => {
        await expect(page.getByRole("main").getByRole("alert")).toHaveText("Not enough rights");
        await expect(page.getByRole("main").getByText(/Version \d+/)).toHaveCount(0);
        await expect(page.getByRole("table")).toHaveCount(0);
      },
    );
  },
);
