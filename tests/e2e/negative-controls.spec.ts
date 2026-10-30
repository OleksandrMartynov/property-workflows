// НЕГАТИВНІ КОНТРОЛІ — навмисно хибні очікування (формат — materials/uat/examples/negative-controls.spec.ts курсу WS8).
// Не AC-тести: назви починаються з NC-, тож ac:coverage їх не рахує. У звичайному прогоні їх немає (проєкт chromium має
// grepInvert @negative-control); запуск: npm run uat:nc. Лише читання: безпечно на проді.
//   NC-1 — у тесті неправильний очікуваний текст → перевірка падає → FAIL, хоч би що сказав агент;
//   NC-2 — текст «Тоді» у вимозі змінено, а тест і застосунок ні → перевірки зелені, агент звіряє кадр із НОВИМ текстом
//          і не погоджується → NEEDS-HUMAN.
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

test.use({ storageState: "playwright/.auth/managerEmpty.json" });

const CLAUSE = 'B sees the message "No runs yet. Launch a template to start one." and the link "Launch a template", and no empty table.';
const CHANGED_CLAUSE = 'B sees the message "There are no runs yet." and the button "New run", and no empty table.';

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "NC-1 (AC-DSYS-04, навмисно хибне очікування в тесті: інший текст порожнього стану)",
  {
    tag: ["@negative-control"],
    annotation: [
      { type: "ac", description: "AC-DSYS-04" },
      { type: "case", description: "NC-1" },
    ],
  },
  async ({ page }) => {
    await given("менеджер B, у якого немає запусків", async () => {
      await page.goto("/");
    });
    await when("B відкриває список запусків", async () => {
      await page.goto("/runs");
    });
    await thenStep(page, { clause: CLAUSE, visible: ["повідомлення «No runs yet. Launch a template to start one.»"] }, async () => {
      await expect(page.getByRole("main").getByText("There are no runs yet.", { exact: true })).toBeVisible({ timeout: 5_000 });
    });
  },
);

test(
  "NC-2 (AC-DSYS-04, текст «Тоді» у вимозі змінено, тест і застосунок — ні)",
  {
    tag: ["@negative-control"],
    annotation: [
      { type: "ac", description: "AC-DSYS-04" },
      { type: "case", description: "NC-2" },
      { type: "ac-text", description: `AC-DSYS-04: Given manager B who has no runs. When B opens the list of runs. Then ${CHANGED_CLAUSE}` },
    ],
  },
  async ({ page }) => {
    await given("менеджер B, у якого немає запусків", async () => {
      await page.goto("/");
    });
    await when("B відкриває список запусків", async () => {
      await page.goto("/runs");
    });
    await thenStep(
      page,
      { clause: CHANGED_CLAUSE, visible: ["повідомлення «There are no runs yet.»", "кнопка «New run»"] },
      async () => {
        await expect(page.getByRole("main").getByText("No runs yet. Launch a template to start one.", { exact: true })).toBeVisible();
        await expect(page.getByRole("table")).toHaveCount(0);
      },
    );
  },
);
