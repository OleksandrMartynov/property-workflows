// UAT зрізу 4 — AI document parsing (requirements/59-parse-a-document-and-confirm-the-values.md, openspec/specs/document-ai):
// один AC — один test, «Тоді» у clause дослівно з тексту PM. Учасники й запуск «Apartment 12, move-in» — ті самі
// синтетичні передумови, що й у зрізі 3 (tests/e2e/auth.setup.ts): менеджер A — менеджер запуску, підрядник V — на
// задачах 3 і 4. Їх прибирає teardown «cleanup» (запуски — разом із збереженими записами, on delete cascade).
// AC-DOCAI-04 кличе живу модель (ключ OpenRouter — лише на сервері проду), тож він іде лише на розгорнутому застосунку
// (UAT_BASE_URL; тег @ai, фільтр — playwright.config.ts); у CI (локальна збірка без ключа) його не запускаємо, а решту AC
// зрізу доводять офлайн-тести (tests/runs, tests/golden.test.ts).
import { expect, test, type Page } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { readFixture, settled, statePath } from "./support/vendor";

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

const fx = () => readFixture();

// Вхідний текст AC-DOCAI-01 / golden case 1 PM — той самий документ, для якого AC-DOCAI-04 описує пропозицію.
const TAP_EMAIL =
  "Subject: Dripping tap. Hi, the kitchen tap in apartment 12 has been dripping for three days. Please send someone this week. My phone is 555-0101. Lena Test";

const block = (page: Page) => page.getByTestId("parse-document");

const thenSettled: typeof thenStep = (page, spec, assertions) =>
  thenStep(page, spec, async () => {
    await assertions();
    await settled(page);
  });

test.describe("Менеджер A на сторінці свого запуску", () => {
  test.use({ storageState: statePath("manager") });

  test(
    "AC-DOCAI-04: A змінює Urgency на «urgent» і обирає «Save values» — на сторінці запуску один збережений запис з email A і часом",
    { tag: ["@uat", "@writes", "@ai"], annotation: { type: "ac", description: "AC-DOCAI-04" } },
    async ({ page }) => {
      const { emails, runs } = fx();
      await given(
        "менеджер A на сторінці запуску, у блоці запропоновано Document type «Maintenance request», Phone «555-0101», Category «plumbing» і Urgency «not urgent»",
        async () => {
          await page.goto(`/runs/${runs.apartment12}`);
          await expect(page.getByTestId("user-email")).toHaveText(emails.manager);
          await expect(page.getByTestId("saved-document")).toHaveCount(0);
          await block(page).getByLabel("Document text").fill(TAP_EMAIL);
          await block(page).getByRole("button", { name: "Propose values" }).click();
          await expect(block(page).getByText("AI proposal")).toBeVisible({ timeout: 90_000 });
          await expect(block(page).getByRole("combobox", { name: "Document type" })).toContainText("Maintenance request");
          await expect(block(page).getByLabel("Phone")).toHaveValue("555-0101");
          await expect(block(page).getByRole("combobox", { name: "Category" })).toContainText("plumbing");
          await expect(block(page).getByRole("combobox", { name: "Urgency" })).toContainText("not urgent");
          // Пропозиція — ще не запис: до «Save values» на сторінці немає жодного збереженого запису.
          await expect(page.getByTestId("saved-document")).toHaveCount(0);
        },
      );

      await when("A змінює Urgency на «urgent» і обирає «Save values»", async () => {
        await block(page).getByRole("combobox", { name: "Urgency" }).click();
        await page.getByRole("option", { name: "urgent", exact: true }).click();
        await block(page).getByRole("button", { name: "Save values" }).click();
      });

      await thenSettled(
        page,
        {
          clause:
            'the page of the run shows one saved record with Document type "Maintenance request", Phone "555-0101", Category "plumbing" and Urgency "urgent", the email of A and the date and time of the confirmation.',
          visible: [
            "розділ «Saved documents» з одним записом",
            "Document type — Maintenance request",
            "Phone — 555-0101",
            "Category — plumbing",
            "Urgency — urgent",
            `email A — ${emails.manager}`,
            "дата й час підтвердження",
          ],
          hidden: ["до «Save values» збережених записів не було (перевірено на кроці «Дано»): модель нічого не пише сама"],
        },
        async () => {
          const saved = page.getByTestId("saved-document");
          await expect(saved).toHaveCount(1);
          await expect(saved).toContainText("Maintenance request");
          await expect(saved).toContainText("555-0101");
          await expect(saved).toContainText("plumbing");
          await expect(saved).toContainText(/\burgent\b/);
          await expect(saved).not.toContainText("not urgent");
          await expect(saved).toContainText(emails.manager);
          await expect(saved).toContainText(/\d{2}:\d{2}/);
        },
      );
    },
  );

  test(
    "AC-DOCAI-11: A обирає «Propose values» з порожнім текстом — блок показує «Paste the text of a document», значень немає",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-DOCAI-11" } },
    async ({ page }) => {
      const { emails, runs } = fx();
      await given("менеджер A на сторінці запуску з текстом лише з пробілів", async () => {
        await page.goto(`/runs/${runs.apartment12}`);
        await expect(page.getByTestId("user-email")).toHaveText(emails.manager);
        await block(page).getByLabel("Document text").fill("   ");
      });

      await when("A обирає «Propose values»", async () => {
        await block(page).getByRole("button", { name: "Propose values" }).click();
      });

      await thenSettled(
        page,
        {
          clause: 'the block shows "Paste the text of a document" and no value is proposed.',
          visible: ["у блоці «Parse a document» — «Paste the text of a document»", "немає форми «Values» з пропозицією AI"],
        },
        async () => {
          await expect(block(page).getByText("Paste the text of a document")).toBeVisible();
          await expect(block(page).getByText("AI proposal")).toHaveCount(0);
          await expect(block(page).getByRole("button", { name: "Save values" })).toHaveCount(0);
        },
      );
    },
  );
});

test.describe("Підрядник V із задачами 3 і 4", () => {
  test.use({ storageState: statePath("vendor") });

  test(
    "AC-DOCAI-14: V відкриває сторінку запуску «Apartment 12, move-in» — блоку «Parse a document» немає",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-DOCAI-14" } },
    async ({ page }) => {
      const { emails, runs } = fx();
      await given("підрядник V — виконавець задач 3 і 4 у запуску «Apartment 12, move-in»", async () => {
        await page.goto(`/runs/${runs.apartment12}`);
        await expect(page.getByTestId("user-email")).toHaveText(emails.vendor);
      });

      await when("V відкриває сторінку цього запуску", async () => {
        await expect(page.getByRole("heading", { name: "Apartment 12, move-in" })).toBeVisible();
      });

      await thenSettled(
        page,
        {
          clause: 'V does not see the block "Parse a document".',
          visible: ["сторінка запуску «Apartment 12, move-in» без блоку «Parse a document»"],
        },
        async () => {
          await expect(page.getByRole("heading", { name: "Parse a document" })).toHaveCount(0);
          await expect(block(page)).toHaveCount(0);
        },
      );
    },
  );
});
