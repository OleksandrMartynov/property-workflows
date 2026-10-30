// AC-DSYS-04 — стан інтерфейсу (порожній список). Лише читання: безпечно на проді.
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

// Окремий менеджер без жодного запуску (supabase/demo-users.json), щоб стан не залежав від інших прогонів на проді.
test.use({ storageState: "playwright/.auth/managerEmpty.json" });

const MANAGER_WITHOUT_RUNS = "manager.d@example.test";

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-DSYS-04: менеджер без запусків відкриває список запусків — «No runs yet. Launch a template to start one.», посилання «Launch a template» і без таблиці",
  { tag: ["@uat"], annotation: { type: "ac", description: "AC-DSYS-04" } },
  async ({ page }) => {
    await given("менеджер B, у якого немає запусків", async () => {
      await page.goto("/");
      await expect(page.getByTestId("user-email")).toHaveText(MANAGER_WITHOUT_RUNS);
    });

    await when("B відкриває список запусків", async () => {
      await page.goto("/runs");
    });

    await thenStep(
      page,
      {
        clause: 'B sees the message "No runs yet. Launch a template to start one." and the link "Launch a template", and no empty table.',
        visible: ["повідомлення «No runs yet. Launch a template to start one.»", "посилання «Launch a template»"],
        hidden: ["порожньої таблиці немає (жодного елемента table на сторінці)", "посилання «Launch a template» веде на /templates"],
      },
      async () => {
        const main = page.getByRole("main");
        await expect(main.getByText("No runs yet. Launch a template to start one.", { exact: true })).toBeVisible();
        const link = main.getByRole("link", { name: "Launch a template", exact: true });
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute("href", "/templates");
        await expect(page.getByRole("table")).toHaveCount(0);
      },
    );
  },
);
