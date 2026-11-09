// UAT зрізу 3 — підрядник (requirements/39-assign-a-vendor-own-tasks.md, openspec/specs/vendor-access, run-launch):
// один AC — один test, «Тоді» у clause дослівно з тексту PM. Учасники й запуски-передумови — синтетичні
// (uat-<run>-…@example.test), їх створює setup без запису (tests/e2e/auth.setup.ts) і прибирає teardown «cleanup».
// AC-VENDOR-07 і AC-VENDOR-09 («напряму, оминаючи сторінки»): правило доводять тести бази на PGlite
// (tests/db/vendor-db.test.ts) і SQL-мутанти V07, V09; тут — прямий запит тим самим ключем, що в браузері підрядника,
// і крок, який показує на екрані «що не змінилося».
import { expect, test, type Browser, type Page } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import {
  ADMINISTRATOR,
  MANAGER_B,
  TENANT_MOVE_IN,
  clientFromState,
  launchTenantMoveIn,
  readFixture,
  settled,
  statePath,
  type Person,
} from "./support/vendor";

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

const fx = () => readFixture();
const taskName = (n: number) => fx().tasks[n - 1].name;

/** Усі адреси @example.test, які видно на сторінці. */
async function visibleEmails(page: Page): Promise<string[]> {
  const text = await page.locator("body").innerText();
  return [...new Set(text.match(/[\w.+-]+@example\.test/gi) ?? [])];
}

/** Друга вкладка під іншою роллю — лише щоб показати на екрані «що не змінилося» (читання). */
async function pageAs(browser: Browser, person: Person) {
  const context = await browser.newContext({ storageState: statePath(person) });
  return { context, page: await context.newPage() };
}

/**
 * Крок «Тоді», де кадр знято після кінця анімацій появи: спершу твердження (вони чекають на вміст), потім
 * settled(page), і лише тоді thenStep знімає кадр — інакше вміст на кадрі напівпрозорий.
 */
const thenSettled: typeof thenStep = (page, spec, assertions) =>
  thenStep(page, spec, async () => {
    await assertions();
    await settled(page);
  });

const taskRow = (page: Page, name: string) => page.getByTestId("run-task").filter({ hasText: name });
/** Статус задачі в рядку — точне слово «to do» / «done» (кнопка «Mark as done» не рахується). */
const taskStatus = (page: Page, name: string, status: "to do" | "done") => taskRow(page, name).getByText(status, { exact: true });

test.describe("Менеджер A призначає підрядника", () => {
  test.use({ storageState: statePath("manager") });

  test(
    "AC-VENDOR-01: A запускає «Tenant move-in» для «Apartment 12, move-in» з V на задачах 3 і 4 — задачі 3 і 4 на V, 1, 2 і 5 на A",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-VENDOR-01" } },
    async ({ page }) => {
      const { emails, tasks } = fx();
      await given("менеджер A, підрядник V і шаблон «Tenant move-in» з 5 задачами", async () => {
        await page.goto(`/templates/${TENANT_MOVE_IN}/launch`);
        await expect(page.getByTestId("user-email")).toHaveText(emails.manager);
        for (const task of tasks.slice(0, 5)) {
          await expect(page.getByRole("combobox", { name: `Assignee of ${task.name}` })).toBeVisible();
        }
      });

      await when("A запускає шаблон для випадку «Apartment 12, move-in» і призначає V виконавцем задач 3 і 4", async () => {
        await page.getByLabel("Case name").fill("Apartment 12, move-in");
        for (const n of [3, 4]) {
          const picker = page.getByRole("combobox", { name: `Assignee of ${taskName(n)}` });
          await picker.click();
          await picker.fill(emails.vendorLaunch);
          await page.getByRole("option").filter({ hasText: emails.vendorLaunch }).click();
        }
        await page.getByRole("button", { name: "Launch", exact: true }).click();
        await page.waitForURL((url) => /^\/runs\/[0-9a-f-]{36}$/.test(url.pathname));
      });
      await thenSettled(
        page,
        {
          clause: "tasks 3 and 4 have V as the assignee, and tasks 1, 2 and 5 have A.",
          visible: [
            `біля задач «${taskName(3)}» і «${taskName(4)}» — email підрядника V (${emails.vendorLaunch})`,
            `біля задач «${taskName(1)}», «${taskName(2)}» і «${taskName(5)}» — email менеджера A (${emails.manager})`,
          ],
        },
        async () => {
          for (const n of [3, 4]) await expect(taskRow(page, taskName(n))).toContainText(emails.vendorLaunch);
          for (const n of [1, 2, 5]) {
            await expect(taskRow(page, taskName(n))).toContainText(emails.manager);
            await expect(taskRow(page, taskName(n))).not.toContainText(emails.vendorLaunch);
          }
        },
      );
    },
  );

  test(
    "AC-VENDOR-02: A відкриває вибір виконавця — email B, адміністратора і V, без імен, ролей та інших даних профілю",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-02" } },
    async ({ page }) => {
      const { emails } = fx();
      const picker = page.getByRole("combobox", { name: `Assignee of ${taskName(1)}` });
      await given("менеджери A і B, адміністратор і підрядник V, і A запускає шаблон", async () => {
        await page.goto(`/templates/${TENANT_MOVE_IN}/launch`);
        await expect(page.getByTestId("user-email")).toHaveText(emails.manager);
        await expect(picker).toBeVisible();
      });

      await when("A відкриває вибір виконавця", async () => {
        await picker.click();
        await expect(page.getByRole("listbox")).toBeVisible();
      });

      // Список виконавців прокручується (на проді — понад 8 акаунтів), тож один кадр не вміщує всіх трьох адрес:
      // кадр 1 — верх списку (B і адміністратор), кадр 2 — після прокрутки до V. «Тоді» в обох — дослівне.
      const clause = "A sees the emails of B, of the administrator and of V, and no names, roles or other profile data.";
      const listbox = page.getByRole("listbox");
      // Варіант, де є напис рівно з цим email (не «pm-admin@…» для «admin@…»; буква аватара — окремий елемент).
      const option = (email: string) => listbox.getByRole("option").filter({ has: page.getByText(email, { exact: true }) });

      // Довгі email (свій рядок A — uat-…-manager@…) переносяться на другий рядок, тож B може бути трохи нижче видимої
      // частини: B — у центр списку (і сторінки); адміністратор на кілька рядків вище й лишається видно.
      await option(MANAGER_B).evaluate((el) => el.scrollIntoView({ block: "center" }));
      await thenSettled(
        page,
        {
          clause,
          visible: [`у списку виконавців — ${MANAGER_B} і ${ADMINISTRATOR}`],
          hidden: [
            `email V (${emails.vendorLaunch}) — нижче в цьому ж списку, на кадрі 2 після прокрутки`,
            "у кожному варіанті списку — лише email (у власному рядку A — ще позначка «run manager», це його роль у запуску, а не дані профілю іншого користувача)",
            "жодного імені з профілів (Demo-…) і жодного слова ролі (manager, admin, vendor) біля чужих email",
          ],
        },
        async () => {
          await expect(option(MANAGER_B)).toBeInViewport({ ratio: 1 });
          await expect(option(ADMINISTRATOR)).toBeInViewport({ ratio: 1 });
          const texts = await listbox.getByRole("option").allInnerTexts();
          // Точний збіг адреси: «admin@example.test» — підрядок і «pm-admin@example.test».
          const shownEmails = texts.map((text) => text.match(/[\w.+-]+@example\.test/i)?.[0]);
          for (const email of [MANAGER_B, ADMINISTRATOR, emails.vendorLaunch]) {
            expect(shownEmails.filter((shown) => shown === email), email).toHaveLength(1);
          }
          for (const text of texts) {
            const shown = text.replace(/\s+/g, " ").trim();
            const email = shown.match(/[\w.+-]+@example\.test/i)?.[0];
            expect(email, `варіант без email: «${shown}»`).toBeTruthy();
            // Аватар — одна літера email (src/components/ui/avatar.tsx), не дані профілю. «run manager» — лише у варіанті
            // самого A (його роль у цьому запуску); біля B, адміністратора чи V ця позначка була б порушенням.
            const own = email === emails.manager;
            const rest = shown.replace(email!, "").replace(own ? /\brun manager\b/ : /$^/, "").replace(/^[A-Z?]\s*/, "").trim();
            expect(rest, `біля ${email} є інші дані: «${rest}»`).toBe("");
          }
          await expect(listbox).not.toContainText(/Demo-/);
        },
      );

      await option(emails.vendorLaunch).evaluate((el) => el.scrollIntoView({ block: "center" }));
      await thenSettled(
        page,
        {
          clause,
          visible: [`у тому самому списку виконавців, прокрученому вниз, — ${emails.vendorLaunch}`],
          hidden: ["біля email V — жодного імені, ролі («vendor») чи інших даних профілю (перевірено для всіх варіантів на кроці 1)"],
        },
        async () => {
          await expect(option(emails.vendorLaunch)).toBeInViewport({ ratio: 1 });
          await expect(option(emails.vendorLaunch)).not.toContainText(/vendor\b(?!-)|Demo-/);
          // Email V довгий (uat-<run>-vendor-launch@…): не обрізаний і не ширший за свій напис, а список — не ширший за
          // панель. Повернене truncate (три крапки) чи розширений убік список тут упадуть.
          const label = option(emails.vendorLaunch).getByText(emails.vendorLaunch, { exact: true });
          expect(await label.evaluate((el) => el.scrollWidth <= el.clientWidth && getComputedStyle(el).textOverflow !== "ellipsis")).toBe(true);
          expect(await listbox.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        },
      );
    },
  );
});

test.describe("Підрядник V із задачами 3 і 4", () => {
  test.use({ storageState: statePath("vendor") });

  test(
    "AC-VENDOR-03: V відкриває список запусків — лише «Apartment 12, move-in» зі статусом і «Your tasks: 0 of 2 done», без «Apartment 14, repair»",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-03" } },
    async ({ page }) => {
      const { emails } = fx();
      await given("V — виконавець 2 задач у «Apartment 12, move-in» і жодної в «Apartment 14, repair»", async () => {
        await page.goto("/");
        await expect(page.getByTestId("user-email")).toHaveText(emails.vendor);
      });

      await when("V відкриває список запусків", async () => {
        await page.goto("/runs");
      });
      await thenSettled(
        page,
        {
          clause:
            'V sees only the run "Apartment 12, move-in" with its run status and "Your tasks: 0 of 2 done", and does not see "Apartment 14, repair".',
          visible: ["один рядок «Apartment 12, move-in»", "статус запуску «in progress»", "«Your tasks: 0 of 2 done»"],
          hidden: ["рядка «Apartment 14, repair» немає ніде на сторінці"],
        },
        async () => {
          const rows = page.getByTestId("run-row");
          await expect(rows).toHaveCount(1);
          await expect(rows.first()).toContainText("Apartment 12, move-in");
          await expect(rows.first()).toContainText("in progress");
          await expect(rows.first().getByTestId("vendor-progress")).toHaveText("Your tasks: 0 of 2 done");
          await expect(page.getByText("Apartment 14, repair")).toHaveCount(0);
        },
      );
    },
  );

  test(
    "AC-VENDOR-04: V відкриває «Apartment 12, move-in» — рівно задачі 3 і 4 з назвою, секцією, «required»/«optional» і статусом; без задач 1, 2, 5, чужих email і прогресу всього запуску",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-04" } },
    async ({ page }) => {
      const { emails, runs, tasks } = fx();
      await given("V — виконавець задач 3 і 4 у запуску «Apartment 12, move-in» з 5 задачами", async () => {
        await page.goto("/runs");
        await expect(page.getByTestId("user-email")).toHaveText(emails.vendor);
      });

      await when("V відкриває цей запуск", async () => {
        await page.goto(`/runs/${runs.apartment12}`);
        await expect(page.getByRole("heading", { level: 1, name: "Apartment 12, move-in" })).toBeVisible();
      });

      const [t3, t4] = [tasks[2], tasks[3]];
      await thenSettled(
        page,
        {
          clause:
            'V sees exactly tasks 3 and 4, each with its name, its section, the mark "required" or "optional" and its status, and does not see tasks 1, 2 and 5, the emails of other users or the progress of the whole run.',
          visible: [
            `задача «${t3.name}» у секції «${t3.section_name}» з позначкою «${t3.required ? "required" : "optional"}» і статусом «to do»`,
            `задача «${t4.name}» у секції «${t4.section_name}» з позначкою «${t4.required ? "required" : "optional"}» і статусом «to do»`,
          ],
          hidden: [
            `задач «${taskName(1)}», «${taskName(2)}» і «${taskName(5)}» на сторінці немає`,
            "на сторінці лише власний email V — жодного email інших користувачів",
            "прогресу всього запуску («N of 5 done») немає — лише «Your tasks: 0 of 2 done»",
          ],
        },
        async () => {
          await expect(page.getByTestId("run-task")).toHaveCount(2);
          for (const task of [t3, t4]) {
            const row = taskRow(page, task.name);
            await expect(row.getByTestId("task-required")).toHaveText(task.required ? "required" : "optional");
            await expect(row.getByText("to do", { exact: true })).toBeVisible();
            const section = page.getByTestId("run-section").filter({ has: row });
            await expect(section.getByRole("heading", { level: 2 })).toHaveText(task.section_name);
          }
          for (const n of [1, 2, 5]) await expect(taskRow(page, taskName(n))).toHaveCount(0);
          expect(await visibleEmails(page)).toEqual([emails.vendor]);
          await expect(page.getByTestId("run-progress")).toHaveCount(0);
          await expect(page.getByText(/\b\d+ of 5 done\b/)).toHaveCount(0);
          await expect(page.getByTestId("vendor-progress")).toHaveText("Your tasks: 0 of 2 done");
        },
      );
    },
  );

  test(
    "AC-VENDOR-06: V за прямим посиланням на «Apartment 14, repair» — «Run not found» і жодної задачі",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-06" } },
    async ({ page }) => {
      const { emails, runs } = fx();
      await given("запуск «Apartment 14, repair», у якому підрядник V не має задач", async () => {
        await page.goto("/runs");
        await expect(page.getByTestId("user-email")).toHaveText(emails.vendor);
        await expect(page.getByText("Apartment 14, repair")).toHaveCount(0);
      });

      await when("V відкриває сторінку цього запуску за прямим посиланням", async () => {
        await page.goto(`/runs/${runs.apartment14}`);
      });
      await thenSettled(
        page,
        {
          clause: 'V sees the message "Run not found" and none of the tasks of the run.',
          visible: ["повідомлення «Run not found»"],
          hidden: ["жодного рядка задачі й жодної секції запуску; назви «Apartment 14, repair» на сторінці немає"],
        },
        async () => {
          await expect(page.getByRole("main").getByText("Run not found", { exact: true })).toBeVisible();
          await expect(page.getByTestId("run-task")).toHaveCount(0);
          await expect(page.getByTestId("run-section")).toHaveCount(0);
          await expect(page.getByText("Apartment 14, repair")).toHaveCount(0);
        },
      );
    },
  );

  test(
    "AC-VENDOR-07: V напряму позначає задачу 1 менеджера A — задача 1 лишається «to do»",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-07" } },
    async ({ page, browser }) => {
      const { emails, runs } = fx();
      const manager = await pageAs(browser, "manager");
      let refusal = "";
      try {
        await given("запуск «Apartment 12, move-in»: задача 1 — на менеджері A, задачі 3 і 4 — на підряднику V", async () => {
          await manager.page.goto(`/runs/${runs.apartment12}`);
          await expect(taskRow(manager.page, taskName(1))).toContainText(emails.manager);
          await expect(taskStatus(manager.page, taskName(1), "to do")).toBeVisible();
          for (const n of [3, 4]) await expect(taskRow(manager.page, taskName(n))).toContainText(emails.vendor);
          // Сторінка V: кнопки для задачі 1 немає — шлях лише напряму.
          await page.goto(`/runs/${runs.apartment12}`);
          await expect(taskRow(page, taskName(1))).toHaveCount(0);
        });

        await when("V намагається позначити задачу 1 виконаною напряму, оминаючи сторінки застосунку", async () => {
          const { data: rows } = await clientFromState("manager")
            .from("run_tasks")
            .select("id, name")
            .eq("run_id", runs.apartment12)
            .eq("name", taskName(1));
          const { error } = await clientFromState("vendor").rpc("complete_task", { p_task_id: rows![0].id });
          refusal = error?.message ?? "";
        });

        await manager.page.reload();
        await thenSettled(
          manager.page,
          {
            clause: 'task 1 stays "to do".',
            visible: [`задача «${taskName(1)}» у запуску «Apartment 12, move-in» — зі статусом «to do» (сторінка менеджера A)`],
            hidden: ["прямий запит підрядника відхилено: функція бази повернула NOT_ALLOWED"],
          },
          async () => {
            expect(refusal).toContain("NOT_ALLOWED");
            await expect(taskStatus(manager.page, taskName(1), "to do")).toBeVisible();
            await expect(taskStatus(manager.page, taskName(1), "done")).toHaveCount(0);
          },
        );
      } finally {
        await manager.context.close();
      }
    },
  );

  test(
    "AC-VENDOR-08: V за прямим посиланням на список шаблонів — «Not enough rights» і жодного шаблону",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-08" } },
    async ({ page }) => {
      const { emails, tasks } = fx();
      await given("підрядник V, який увійшов", async () => {
        await page.goto("/runs");
        await expect(page.getByTestId("user-email")).toHaveText(emails.vendor);
      });

      await when("V відкриває список шаблонів за прямим посиланням", async () => {
        await page.goto("/templates");
      });
      await thenSettled(
        page,
        {
          clause: 'V sees the message "Not enough rights" and no template.',
          visible: ["повідомлення «Not enough rights»"],
          hidden: ["жодного шаблону: ні «Tenant move-in», ні назви його задач, ні таблиці чи карток шаблонів"],
        },
        async () => {
          await expect(page.getByRole("main").getByRole("alert")).toHaveText("Not enough rights");
          await expect(page.getByText("Tenant move-in")).toHaveCount(0);
          await expect(page.getByText(tasks[0].name)).toHaveCount(0);
          await expect(page.getByRole("table")).toHaveCount(0);
        },
      );
    },
  );

  test(
    "AC-VENDOR-09: V напряму запускає «Tenant move-in» — запуск не створено, список запусків не змінився",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-09" } },
    async ({ page }) => {
      const { emails } = fx();
      let before: string[] = [];
      let refusal = "";
      let created: unknown = null;
      await given("підрядник V, який увійшов, і шаблон «Tenant move-in» з поточною версією", async () => {
        await page.goto("/runs");
        await expect(page.getByTestId("user-email")).toHaveText(emails.vendor);
        before = await page.getByTestId("run-row").allTextContents();
      });

      await when("V намагається запустити цей шаблон напряму, оминаючи сторінки застосунку", async () => {
        const { data, error } = await clientFromState("vendor").rpc("launch_run", {
          p_template_id: TENANT_MOVE_IN,
          p_case_name: "Apartment 16, move-in",
          p_assignees: {},
        });
        created = data;
        refusal = error?.message ?? "";
        await page.reload();
      });
      await thenSettled(
        page,
        {
          clause: "no run is created, and the list of runs does not change.",
          visible: ["список запусків V — той самий, що до запиту: лише «Apartment 12, move-in»"],
          hidden: ["запит відхилено: функція бази повернула LAUNCH_NOT_ALLOWED і жодного id запуску", "запуску «Apartment 16, move-in» немає"],
        },
        async () => {
          expect(refusal).toContain("LAUNCH_NOT_ALLOWED");
          expect(created).toBeNull();
          await expect(page.getByTestId("run-row")).toHaveText(before);
          await expect(page.getByText("Apartment 16, move-in")).toHaveCount(0);
        },
      );
    },
  );
});

test.describe("Підрядник V позначає свою задачу", () => {
  test.use({ storageState: statePath("vendorDone") });

  test(
    "AC-VENDOR-05: V позначає свою задачу 3 «done» — задача 3 «done», «Your tasks: 1 of 2 done»",
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-VENDOR-05" } },
    async ({ page }) => {
      const { emails, ids, tasks } = fx();
      // Свій запуск на кожне виконання: позначка змінює стан, тож повтор (--repeat-each) не бере вже виконану задачу.
      const runId = await launchTenantMoveIn(clientFromState("manager"), "Apartment 12, move-in", {
        [tasks[2].template_task_id]: ids.vendorDone,
        [tasks[3].template_task_id]: ids.vendorDone,
      });
      await given("V — виконавець задачі 3 зі статусом «to do», яка не є останньою обов'язковою задачею запуску", async () => {
        await page.goto(`/runs/${runId}`);
        await expect(page.getByTestId("user-email")).toHaveText(emails.vendorDone);
        await expect(taskStatus(page, taskName(3), "to do")).toBeVisible();
        // Не остання обов'язкова: у цьому свіжому запуску лишаються невиконані обов'язкові задачі менеджера A (крім
        // задачі 3) — тому «Mark as done» нижче без підтвердження (AC-TASK-16), а задача 3 не завершує запуск.
        expect(tasks.filter((task, index) => index !== 2 && index !== 3 && task.required).length).toBeGreaterThan(0);
        await expect(page.getByTestId("vendor-progress")).toHaveText("Your tasks: 0 of 2 done");
      });

      await when("V позначає задачу 3 виконаною", async () => {
        await taskRow(page, taskName(3)).getByRole("button", { name: "Mark as done" }).click();
        // Без підтвердження: задача 3 не остання обов'язкова (діалогу немає).
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        await expect(page.getByTestId("vendor-progress")).toHaveText(/1 of 2/);
      });
      await thenSettled(
        page,
        {
          clause: 'task 3 has status "done", and V sees "Your tasks: 1 of 2 done".',
          visible: [`задача «${taskName(3)}» зі статусом «done»`, "«Your tasks: 1 of 2 done»"],
          hidden: ["задача 4 V лишилась «to do»", "після перезавантаження сторінки — те саме: «done» і «Your tasks: 1 of 2 done» збережено в базі"],
        },
        async () => {
          await expect(taskStatus(page, taskName(3), "done")).toBeVisible();
          await expect(taskStatus(page, taskName(3), "to do")).toHaveCount(0);
          await expect(page.getByTestId("vendor-progress")).toHaveText("Your tasks: 1 of 2 done");
          await expect(taskStatus(page, taskName(4), "to do")).toBeVisible();
          // Стан збережено в базі, а не лише на сторінці: після перезавантаження — те саме.
          await page.reload();
          await expect(taskStatus(page, taskName(3), "done")).toBeVisible();
          await expect(page.getByTestId("vendor-progress")).toHaveText("Your tasks: 1 of 2 done");
        },
      );
    },
  );
});

test.describe("Підрядник V без задач", () => {
  test.use({ storageState: statePath("vendorEmpty") });

  test(
    "AC-VENDOR-10: V без задач відкриває список запусків — «No tasks assigned to you yet.» без порожньої таблиці",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-10" } },
    async ({ page }) => {
      const { emails } = fx();
      await given("підрядник V, якому не призначено жодної задачі", async () => {
        await page.goto("/");
        await expect(page.getByTestId("user-email")).toHaveText(emails.vendorEmpty);
      });

      await when("V відкриває список запусків", async () => {
        await page.goto("/runs");
      });
      await thenSettled(
        page,
        {
          clause: 'V sees the message "No tasks assigned to you yet." and no empty table.',
          visible: ["повідомлення «No tasks assigned to you yet.»"],
          hidden: ["порожньої таблиці немає (жодного елемента table і жодного рядка запуску)"],
        },
        async () => {
          await expect(page.getByRole("main").getByText("No tasks assigned to you yet.", { exact: true })).toBeVisible();
          await expect(page.getByRole("table")).toHaveCount(0);
          await expect(page.getByTestId("run-row")).toHaveCount(0);
        },
      );
    },
  );
});
