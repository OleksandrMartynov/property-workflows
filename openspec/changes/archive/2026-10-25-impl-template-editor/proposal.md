# План реалізації: редактор шаблону з версіями і єдина дизайн-система (зріз 2, WS7)

## Why

Реалізуємо зріз 2 — специфікації `openspec/specs/template-editor/spec.md` і `openspec/specs/ui-consistency/spec.md`
(зміна `add-template-editor`), перекладені зі знімка вимог PM від 2026-10-25 (шапка `docs/conformance.md`:
`Вимоги: https://github.com/solomchaak/property-workflows-spec · джерело: issues · знімок 2026-10-25`). Адміністратор
редагує шаблон і зберігає пронумеровані версії, менеджери працюють лише з поточною версією, запуск показує свою
версію, а всі сторінки однаково показують статуси, відмови й порожні стани на дизайн-системі з PR #18.

## What Changes

Зміна плану (`skip_specs: true`): специфікацію не змінює, лише описує, як реалізуємо AC з `openspec/specs/`.

- Задача 1 — версії шаблону в базі: AC-EDITOR-01, AC-EDITOR-02, AC-EDITOR-03, AC-EDITOR-04, AC-EDITOR-06,
  AC-EDITOR-08.
- Задача 2 — редактор, список версій і відмови на сторінках: AC-EDITOR-05, AC-EDITOR-07, AC-EDITOR-09, AC-DSYS-01,
  AC-DSYS-02, AC-DSYS-03, AC-DSYS-04.
