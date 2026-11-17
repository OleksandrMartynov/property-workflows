## 1. База

- [x] 1.1 Міграція `run_documents`: таблиця, RLS, `check_run_document`, `save_run_document`; прибрати документи задач
  (#92). Тести на PGlite і SQL-мутанти D1–D5.
  Done when: AC-DOCAI-04, AC-DOCAI-15, AC-DOCAI-16

## 2. Дії

- [x] 2.1 `requestDocumentDraft` і `saveRunDocument` на рівні запуску: права до виклику моделі, стани draft /
  unavailable / error, тексти AC дослівно.
  Done when: AC-DOCAI-01, AC-DOCAI-02, AC-DOCAI-06, AC-DOCAI-07, AC-DOCAI-08, AC-DOCAI-09, AC-DOCAI-10, AC-DOCAI-11, AC-DOCAI-13, AC-DOCAI-16

## 3. Сторінка запуску

- [x] 3.1 Блок «Parse a document» (текст, «Upload a text file», «Propose values», поля, «Save values», «Discard») і
  список збережених записів; видимість — менеджер запуску й адміністратор.
  Done when: AC-DOCAI-03, AC-DOCAI-04, AC-DOCAI-05, AC-DOCAI-12, AC-DOCAI-14, AC-DOCAI-15
