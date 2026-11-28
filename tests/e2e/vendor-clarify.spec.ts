// UAT уточнень зрізу 3 після відповідей PM (requirements/39-assign-a-vendor-own-tasks.md і
// requirements/3-complete-tasks-and-track-run-progress.md, журнал змін 2026-11-10; openspec/specs/vendor-access,
// run-progress): AC-VENDOR-11…18 і AC-TASK-19 — один AC, один test, «Тоді» у clause дослівно з тексту PM.
// Учасники й запуски-передумови — ті самі синтетичні uat-<run>-…@example.test із setup (tests/e2e/auth.setup.ts);
// AC, що змінюють стан (11, 16, TASK-19), створюють власний запуск від імені синтетичного менеджера A (прибирає teardown).
// «Напряму, оминаючи сторінки» (15, 17, 18): правило доводять тести бази (tests/db/vendor-clarify-db.test.ts) і
// SQL-мутанти V15, V04, V06; тут — прямий запит тим самим ключем, що в браузері підрядника, і кадр «що на екрані».
import { expect, test, type Page } from "@playwright/test";
import { attachRuntimeErrors, given, when } from "./support/uat";
import {
  TENANT_MOVE_IN,
  clientFromState,
  launchTenantMoveIn,
  pageAs,
  readFixture,
  statePath,
  taskRow,
  taskStatus,
  thenSettled,
} from "./support/vendor";

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

const fx = () => readFixture();
const taskName = (n: number) => fx().tasks[n - 1].name;
const RUN_NOT_FOUND = "Run not found";

/** id задач запуску за номером у шаблоні (1…5) — від імені менеджера A (він бачить увесь запуск). */
async function runTaskIds(runId: string): Promise<string[]> {
  const { data, error } = await clientFromState("manager")
    .from("run_tasks")
    .select("id")
    .eq("run_id", runId)
    .order("section_position")
    .order("position");
  if (error) throw error;
  return data.map((row) => row.id as string);
}

/** Менеджер A позначає всі обов'язкові задачі запуску (остання — з підтвердженням): запуск стає «completed». */
async function completeRequired(runId: string) {
  const ids = await runTaskIds(runId);
  const required = fx()
    .tasks.map((task, i) => ({ ...task, id: ids[i] }))
    .filter((task) => task.required);
  const manager = clientFromState("manager");
  for (const [i, task] of required.entries()) {
    const { error } = await manager.rpc("complete_task", { p_task_id: task.id, p_confirmed: i === required.length - 1 });
    if (error) throw new Error(`позначка «${task.name}»: ${error.message}`);
  }
}

/** Номер першої необов'язкової задачі поточної версії «Tenant move-in» (1…5). */
const firstOptional = () => fx().tasks.findIndex((task) => !task.required) + 1;

const navLinks = (page: Page) => page.getByRole("navigation", { name: "Main" }).getByRole("link");

test.describe("Підрядник V після уточнень PM", () => {
  test.use({ storageState: statePath("vendorDone") });

  test(
    "AC-VENDOR-11: V відкриває «Apartment 12, move-in» з задачами 3 («done») і 4 («to do») — назва випадку як заголовок і «Your tasks: 1 of 2 done», без статусу запуску й шаблону",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-VENDOR-11" } },
    async ({ page }) => {
      const { ids, tasks } = fx();
      let runId = "";
      await given("підрядник V — виконавець задач 3 («done») і 4 («to do») у запуску «Apartment 12, move-in» з 5 задачами", async () => {
        runId = await launchTenantMoveIn(clientFromState("manager"), "Apartment 12, move-in", {
          [tasks[2].template_task_id]: ids.vendorDone,
          [tasks[3].template_task_id]: ids.vendorDone,
        });
        const task3 = (await runTaskIds(runId))[2];
        const { error } = await clientFromState("vendorDone").rpc("complete_task", { p_task_id: task3 });
        expect(error).toBeNull();
      });

      await when("V відкриває цей запуск", async () => {
        await page.goto(`/runs/${runId}`);
      });
      await thenSettled(
        page,
        {
          clause:
            'V sees the case name "Apartment 12, move-in" as the title of the page and "Your tasks: 1 of 2 done", and does not see the run status, the template name or the template version.',
          visible: ["заголовок сторінки «Apartment 12, move-in»", "«Your tasks: 1 of 2 done»", "без статусу запуску, назви й версії шаблону"],
          hidden: ["на сторінці немає слів «in progress» / «completed», «Tenant move-in» і «Template version»"],
        },
        async () => {
          const main = page.getByRole("main");
          await expect(main.getByRole("heading", { level: 1 })).toHaveText("Apartment 12, move-in");
          await expect(main.getByText("Your tasks: 1 of 2 done")).toBeVisible();
          await expect(taskStatus(page, taskName(3), "done")).toBeVisible();
          await expect(taskStatus(page, taskName(4), "to do")).toBeVisible();
          for (const hidden of [/in progress/i, /completed/i, "Tenant move-in", /Template version/i]) await expect(main.getByText(hidden)).toHaveCount(0);
        },
      );
    },
  );

  test(
    "AC-VENDOR-16: V позначає свою необов'язкову задачу «to do» у завершеному запуску «Apartment 12, move-in» — «done», «Your tasks: 1 of 1 done», запуск лишається «completed»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-VENDOR-16" } },
    async ({ page }) => {
      const { ids, tasks } = fx();
      const optional = firstOptional();
      let runId = "";
      await given(`запуск «Apartment 12, move-in» зі статусом «completed», у якому V — виконавець необов'язкової задачі «${taskName(optional)}» зі статусом «to do»`, async () => {
        expect(optional, "у «Tenant move-in» має бути необов'язкова задача").toBeGreaterThan(0);
        runId = await launchTenantMoveIn(clientFromState("manager"), "Apartment 12, move-in", {
          [tasks[optional - 1].template_task_id]: ids.vendorDone,
        });
        await completeRequired(runId);
        await page.goto(`/runs/${runId}`);
        await expect(taskStatus(page, taskName(optional), "to do")).toBeVisible();
        await expect(page.getByRole("main").getByText("Your tasks: 0 of 1 done")).toBeVisible();
      });

      await when(`V позначає «${taskName(optional)}» виконаною`, async () => {
        await taskRow(page, taskName(optional)).getByRole("button", { name: "Mark as done" }).click();
        await expect(taskStatus(page, taskName(optional), "done")).toBeVisible();
      });

      await page.goto("/runs");
      await thenSettled(
        page,
        {
          clause: 'task 3 has status "done", V sees "Your tasks: 1 of 1 done", and the run stays "completed".',
          visible: ["рядок «Apartment 12, move-in» у списку запусків V — статус «completed» і «Your tasks: 1 of 1 done»"],
          hidden: [
            `«task 3» PM — необов'язкова задача V; у поточній версії «Tenant move-in» це «${taskName(optional)}» (задача ${optional})`,
            "у базі задача — status = done, done_by = V; запуск — status = completed",
          ],
        },
        async () => {
          const row = page.getByRole("main").getByRole("row").filter({ has: page.getByRole("link", { name: "Apartment 12, move-in" }) }).filter({ hasText: "1 of 1 done" });
          await expect(row).toHaveCount(1);
          await expect(row).toContainText("Your tasks: 1 of 1 done");
          await expect(row).toContainText("completed");
          const { data } = await clientFromState("vendorDone").from("run_tasks").select("status, done_by").eq("run_id", runId);
          expect(data).toEqual([{ status: "done", done_by: ids.vendorDone }]);
        },
      );
    },
  );
});

test.describe("Підрядник V: список, навігація й закриті сторінки", () => {
  test.use({ storageState: statePath("vendor") });

  test(
    "AC-VENDOR-12: рядок «Apartment 12, move-in» у списку запусків V — назва випадку, статус і «Your tasks: 0 of 2 done», без назви шаблону «Tenant move-in»",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-12" } },
    async ({ page }) => {
      await given("підрядник V — виконавець 2 задач у запуску «Apartment 12, move-in», запущеному з шаблону «Tenant move-in»", async () => {
        const { data } = await clientFromState("manager").from("runs").select("template_name").eq("id", fx().runs.apartment12).single();
        expect(data?.template_name).toBe("Tenant move-in");
      });
      await when("V відкриває список запусків", async () => {
        await page.goto("/runs");
      });
      await thenSettled(
        page,
        {
          clause: 'the row of this run shows the case name, the run status and "Your tasks: 0 of 2 done", and does not show the template name "Tenant move-in".',
          visible: ["рядок «Apartment 12, move-in» — статус «in progress» і «Your tasks: 0 of 2 done»", "без «Tenant move-in»"],
          hidden: [],
        },
        async () => {
          const row = page.getByRole("main").getByRole("row").filter({ has: page.getByRole("link", { name: "Apartment 12, move-in" }) });
          await expect(row).toHaveCount(1);
          await expect(row).toContainText("in progress");
          await expect(row).toContainText("Your tasks: 0 of 2 done");
          await expect(page.getByRole("main").getByText("Tenant move-in")).toHaveCount(0);
        },
      );
    },
  );

  test(
    "AC-VENDOR-13: V входить — бачить список запусків, а навігація показує лише «Runs» і «Profile»",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-13" } },
    async ({ page }) => {
      await given("підрядник V — виконавець 2 задач у запуску «Apartment 12, move-in»", async () => {
        expect(fx().runs.apartment12).toBeTruthy();
      });
      await when("V входить (відкриває застосунок — головну сторінку)", async () => {
        await page.goto("/");
      });
      await thenSettled(
        page,
        {
          clause: 'V sees the list of runs, and the navigation shows only "Runs" and "Profile".',
          visible: ["сторінка «Runs» зі списком запусків V", "у навігації лише «Runs» і «Profile»"],
          hidden: ["вхід — сесія з setup (паролі синтетичних акаунтів ніде не зберігаються); після «/» застосунок веде V на /runs"],
        },
        async () => {
          await expect(page).toHaveURL(/\/runs$/);
          await expect(page.getByRole("main").getByRole("heading", { level: 1, name: "Runs" })).toBeVisible();
          await expect(page.getByRole("main").getByRole("link", { name: "Apartment 12, move-in" })).toBeVisible();
          await expect(navLinks(page)).toHaveText(["Runs", "Profile"]);
        },
      );
    },
  );

  test(
    "AC-VENDOR-14: V за прямим посиланням відкриває форму запуску, сторінку шаблону, список версій і редактор — «Not enough rights» і «Back to runs», без вмісту шаблону",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-14" } },
    async ({ page }) => {
      await given("підрядник V, який увійшов", async () => {
        await page.goto("/runs");
        await expect(page.getByTestId("user-email")).toHaveText(fx().emails.vendor);
      });
      const pages = [
        ["форма запуску", `/templates/${TENANT_MOVE_IN}/launch`],
        ["сторінка шаблону", `/templates/${TENANT_MOVE_IN}`],
        ["список версій", `/templates/${TENANT_MOVE_IN}/versions`],
        ["редактор", `/templates/${TENANT_MOVE_IN}/edit`],
      ] as const;
      for (const [what, href] of pages) {
        await when(`V відкриває ${what} за прямим посиланням`, async () => {
          await page.goto(href);
        });
        await thenSettled(
          page,
          {
            clause: 'V sees the message "Not enough rights" and the link "Back to runs", and no content of the template.',
            visible: [`${what}: повідомлення «Not enough rights» і посилання «Back to runs»`, "жодного вмісту шаблону"],
            hidden: ["немає «Tenant move-in», назв його задач, полів форми запуску й кнопок редактора"],
          },
          async () => {
            const main = page.getByRole("main");
            await expect(main.getByRole("alert")).toHaveText("Not enough rights");
            await expect(main.getByRole("link", { name: "Back to runs" })).toHaveAttribute("href", "/runs");
            for (const content of ["Tenant move-in", taskName(1), "Case name", "Add task"]) await expect(main.getByText(content)).toHaveCount(0);
          },
        );
      }
    },
  );

  test(
    "AC-VENDOR-15: V напряму позначає задачу 1 запуску «Apartment 14, repair», де в нього немає задач, — задача 1 лишається «to do», V отримує «Run not found»",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-15" } },
    async ({ browser }) => {
      const { runs, emails } = fx();
      const manager = await pageAs(browser, "manager");
      let refusal = "";
      let refusalText = "";
      try {
        await given("запуск «Apartment 14, repair», у якому підрядник V не має задач, а задача 1 — на менеджері A", async () => {
          await manager.page.goto(`/runs/${runs.apartment14}`);
          await expect(taskRow(manager.page, taskName(1))).toContainText(emails.manager);
          await expect(taskStatus(manager.page, taskName(1), "to do")).toBeVisible();
        });
        await when("V намагається позначити задачу 1 виконаною напряму, оминаючи сторінки застосунку", async () => {
          const task1 = (await runTaskIds(runs.apartment14))[0];
          const { error } = await clientFromState("vendor").rpc("complete_task", { p_task_id: task1 });
          refusal = error?.message ?? "";
          refusalText = error?.details ?? "";
        });
        await manager.page.reload();
        await thenSettled(
          manager.page,
          {
            clause: 'task 1 stays "to do", and V gets the message "Run not found".',
            visible: [`задача «${taskName(1)}» у запуску «Apartment 14, repair» — зі статусом «to do» (сторінка менеджера A)`],
            hidden: ["V отримав у відповіді на прямий запит повідомлення «Run not found» (код RUN_NOT_FOUND, поле details)"],
          },
          async () => {
            expect(refusal).toBe("RUN_NOT_FOUND");
            expect(refusalText).toBe(RUN_NOT_FOUND);
            await expect(taskStatus(manager.page, taskName(1), "to do")).toBeVisible();
          },
        );
      } finally {
        await manager.context.close();
      }
    },
  );

  test(
    "AC-VENDOR-17: V напряму запитує задачі «Apartment 12, move-in» — отримує лише задачі 3 і 4",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-17" } },
    async ({ page }) => {
      const { runs } = fx();
      let received: string[] = [];
      await given("підрядник V — виконавець задач 3 і 4 у запуску «Apartment 12, move-in» з 5 задачами", async () => {
        expect(await runTaskIds(runs.apartment12)).toHaveLength(5);
      });
      await when("V запитує задачі цього запуску напряму, оминаючи сторінки застосунку", async () => {
        const { data, error } = await clientFromState("vendor").from("run_tasks").select("name").eq("run_id", runs.apartment12);
        expect(error).toBeNull();
        received = (data ?? []).map((row) => row.name as string);
      });
      await page.goto(`/runs/${runs.apartment12}`);
      await thenSettled(
        page,
        {
          clause: "V receives only tasks 3 and 4.",
          visible: [`сторінка запуску V — лише «${taskName(3)}» і «${taskName(4)}»`],
          hidden: [`прямий запит run_tasks повернув рівно 2 задачі: «${taskName(3)}» і «${taskName(4)}»`],
        },
        async () => {
          expect(received.sort()).toEqual([taskName(3), taskName(4)].sort());
          await expect(page.getByTestId("run-task")).toHaveCount(2);
        },
      );
    },
  );

  test(
    "AC-VENDOR-18: V напряму запитує email і профілі інших користувачів і задачі «Apartment 14, repair» — не отримує нічого",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-18" } },
    async ({ page }) => {
      const { runs, ids } = fx();
      const received: Record<string, unknown[]> = {};
      await given("підрядник V — виконавець задач 3 і 4 у «Apartment 12, move-in» і жодної задачі в «Apartment 14, repair»", async () => {
        expect(await runTaskIds(runs.apartment14)).toHaveLength(5);
      });
      await when("V напряму, оминаючи сторінки, запитує email і профілі інших користувачів і задачі «Apartment 14, repair»", async () => {
        const vendor = clientFromState("vendor");
        received.profiles = (await vendor.from("profiles").select("id, email").neq("id", ids.vendor)).data ?? [];
        received.assignable = (await vendor.rpc("list_assignable_users")).data ?? [];
        received.run = (await vendor.from("runs").select("id").eq("id", runs.apartment14)).data ?? [];
        received.tasks = (await vendor.from("run_tasks").select("id").eq("run_id", runs.apartment14)).data ?? [];
        received.vendorRun = (await vendor.rpc("vendor_runs", { p_run_id: runs.apartment14 })).data ?? [];
      });
      await page.goto(`/runs/${runs.apartment14}`);
      await thenSettled(
        page,
        {
          clause: 'V receives nothing about other users or about "Apartment 14, repair".',
          visible: ["сторінка «Apartment 14, repair» для V — «Run not found», без задач"],
          hidden: ["прямі запити profiles (інші), list_assignable_users, runs, run_tasks і vendor_runs для «Apartment 14, repair» — порожні"],
        },
        async () => {
          expect(received).toEqual({ profiles: [], assignable: [], run: [], tasks: [], vendorRun: [] });
          await expect(page.getByRole("main").getByText(RUN_NOT_FOUND)).toBeVisible();
          await expect(page.getByTestId("run-task")).toHaveCount(0);
        },
      );
    },
  );
});

test.describe("Менеджер A: необов'язкова задача завершеного запуску", () => {
  test.use({ storageState: statePath("manager") });

  test(
    "AC-TASK-19: виконавець позначає необов'язкову задачу «to do» завершеного запуску — «done», запуск лишається «completed», прогрес її рахує",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-TASK-19" } },
    async ({ page }) => {
      const optional = firstOptional();
      let runId = "";
      await given(`запуск зі статусом «completed», у якому необов'язкова задача «${taskName(optional)}» має статус «to do», і її виконавець (менеджер A)`, async () => {
        runId = await launchTenantMoveIn(clientFromState("manager"), "Apartment 3, repair", {});
        await completeRequired(runId);
        await page.goto(`/runs/${runId}`);
        await expect(page.getByRole("main").getByText("completed", { exact: true }).first()).toBeVisible();
        await expect(taskStatus(page, taskName(optional), "to do")).toBeVisible();
      });

      const required = fx().tasks.filter((task) => task.required).length;
      await when(`виконавець позначає «${taskName(optional)}» виконаною`, async () => {
        await taskRow(page, taskName(optional)).getByRole("button", { name: "Mark as done" }).click();
        await expect(taskStatus(page, taskName(optional), "done")).toBeVisible();
      });
      await thenSettled(
        page,
        {
          clause: 'the task has status "done", the run stays "completed", and the progress counts the task as done.',
          visible: [`«${taskName(optional)}» — «done»`, "статус запуску «completed»", `прогрес «${required + 1} of 5 done»`],
          hidden: ["«Order a part» PM — необов'язкова задача; у «Tenant move-in» це " + `«${taskName(optional)}»`],
        },
        async () => {
          await expect(taskStatus(page, taskName(optional), "done")).toBeVisible();
          await expect(page.getByRole("main").getByText("completed", { exact: true }).first()).toBeVisible();
          await expect(page.getByRole("main").getByText(`${required + 1} of 5 done`).first()).toBeVisible();
        },
      );
    },
  );
});
