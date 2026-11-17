# Дизайн: зріз 4 «Parse a document»

## Рішення

| Рішення | AC |
|---|---|
| Блок «Parse a document» — на сторінці запуску (`parse-document-block.tsx`), а не в рядку задачі. Документ задачі з #92 прибрано (ADR 0009 замінює частину ADR 0008 про зберігання) | AC-DOCAI-01, 14, 15 |
| Хто бачить блок і записи — `canParseDocuments` (адміністратор або менеджер цього запуску); сторінка не читає `run_documents` для інших | AC-DOCAI-14, 15 |
| Таблиця `run_documents` (міграція `20261116162440_run_documents.sql`): кілька записів на запуск, `saved_by`, `saved_at`; RLS select — адміністратор або менеджер запуску; клієнт лише читає | AC-DOCAI-04, 15, 16 |
| `check_run_document` (до виклику моделі) і `save_run_document` (запис) — `security definer` у `private`, `set search_path = ''`; будь-хто інший — `DOCUMENT_NOT_ALLOWED` → «Not enough rights» | AC-DOCAI-16 |
| `requestDocumentDraft` нічого не пише; стани `draft`, `unavailable` (порожні поля для ручного введення), `error` | AC-DOCAI-01, 09, 11, 13 |
| Тексти дослівно з AC: `MESSAGES` (11, 12, 16), `ASSISTANT_UNAVAILABLE` (13), `REFUSED_MESSAGE` (09), примітки — `normalizeNotes` зводить слова моделі до тексту PM (07, 10), попередження суми — `totalWarning` (08) | AC-DOCAI-07…13, 16 |
| Підписи значень — дослівно з AC: «Maintenance request», «plumbing», «heating and cooling», «not urgent»; дата запису — «12 Nov 2026, 10:15» за Києвом | AC-DOCAI-01, 04, 06, 10 |
| Файл — лише `.txt` (`isPlainTextFile`), текст файлу читається в поле в браузері; на сервер іде лише текст, межа — 8000 символів | AC-DOCAI-11, 12 |
| Стан читання — `ProposeControls` («Reading the document…», вимкнена «Propose values»), значення приховано, поки AI читає | AC-DOCAI-03 |
| «Discard» очищає блок без жодного запиту; записів немає, доки людина не натисне «Save values» | AC-DOCAI-05 |

## Ризики

- Вартість і ліміти: 0 $, лише безкоштовні моделі; 20 запитів/хв і 50/день на акаунт — живий eval робить паузу
  15 с перед кейсом і зупиняється на першому 429 (NOT RUN). На проді ліміт вичерпується — стан AC-DOCAI-13.

- Деструктивна міграція: `run_task_documents` і функції задачі прибрано — там лише синтетичні дані з #92.
- Промпт (`document-v1`) лишився без змін: правило терміновості в промпті ширше за текст PM лише формулюванням. Перезапис
  golden-записів після правки промпту потребує живого прогону з ключем (`RECORD=1 npm run eval`) — робить власник ключа.

## AI

Вартість і ліміти — у «Ризиках» нижче: окремого AC на них немає.

| Що | Рішення | AC |
|---|---|---|
| Модель | лише `:free` через OpenRouter, ланцюжок `google/gemma-4-31b-it:free` → `google/gemma-4-26b-a4b-it:free` → `nvidia/nemotron-3.5-super-vl:free` (`src/lib/ai/models.ts`, ADR 0008); ключ `OPENROUTER_API_KEY` читає лише `src/lib/ai/openrouter.ts` з `server-only` | AC-DOCAI-01, 13 |
| Вихід | `generateText` + `Output.object` зі схемою zod (`src/lib/ai/schema.ts`): стани `ok` / `needs_info` / `refused`, «немає в документі» = `null` | AC-DOCAI-01, 06, 09 |
| Перевірки кодом | `applyRules`: телефон 555-0101, сума позицій проти Total (попередження, числа не виправляємо), порожні значення відмови, примітки PM дослівно (`normalizeNotes`) | AC-DOCAI-07, 08, 09, 10 |
| Ін'єкція | текст документа — між межами `<document>…</document>`, теги з тексту вирізаємо; інструкції всередині — дані й примітка | AC-DOCAI-10 |
| Збої | немає ключа, 429, тайм-аут, відповідь не за схемою — один стан «The assistant is not available now. Fill in the values yourself.» з порожніми полями | AC-DOCAI-13 |
| Людина в контурі | модель лише пропонує; запис — `save_run_document` після «Save values», з `getClaims()`, роллю й повторною перевіркою форми | AC-DOCAI-04, 05, 16 |
| Якість | 10 golden cases PM: офлайн-реплей справжніх записів (`RECORD=1`, промпт `document-v2`) у `npm test` з AC ID у назвах; живий прогін `npm run eval` зі звітом у `evals/reports/` — 9/10, FAIL пояснено у звіті | AC-DOCAI-01, 02, 06…10 |
