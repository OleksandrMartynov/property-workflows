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

- Деструктивна міграція: `run_task_documents` і функції задачі прибрано — там лише синтетичні дані з #92.
- Промпт (`document-v1`) лишився без змін: правило терміновості в промпті ширше за текст PM лише формулюванням. Перезапис
  golden-записів після правки промпту потребує живого прогону з ключем (`RECORD=1 npm run eval`) — робить власник ключа.
