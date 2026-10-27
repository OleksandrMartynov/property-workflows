# План реалізації: уточнення зрізу 2 після відповідей PM (редактор шаблону, тема, повернення після входу)

## Why

Реалізуємо уточнення зрізу 2 — сценарії, додані в `openspec/specs/template-editor/spec.md` і
`openspec/specs/ui-consistency/spec.md` зміною специфікації `clarify-template-editor` за знімком вимог PM від
2026-10-27 (`Вимоги: https://github.com/solomchaak/property-workflows-spec · джерело: issues · знімок 2026-10-27`).
PM відповів на питання розробників (https://github.com/solomchaak/property-workflows-spec/issues/21 …
https://github.com/solomchaak/property-workflows-spec/issues/38) і додав вибір теми та повернення на сторінку після
входу.

## What Changes

Зміна плану (`skip_specs: true`): специфікацію не змінює, лише описує, як реалізуємо AC з `openspec/specs/`.

- Задача 1 — тема й повернення після входу: AC-DSYS-05, AC-DSYS-06, AC-DSYS-07, AC-DSYS-08.
- Задача 2 — сторінка шаблону для менеджера, недоступний шаблон, «Template not found», порожні стани й тести
  наявної поведінки: AC-EDITOR-02, AC-EDITOR-10, AC-EDITOR-11, AC-EDITOR-12, AC-EDITOR-13, AC-EDITOR-14,
  AC-EDITOR-15, AC-EDITOR-16, AC-EDITOR-17, AC-EDITOR-18, AC-EDITOR-21, AC-EDITOR-22, AC-EDITOR-26, AC-EDITOR-27,
  AC-EDITOR-28, AC-EDITOR-29.
- Задача 3 — правила назв: AC-EDITOR-19, AC-EDITOR-20, AC-EDITOR-23, AC-EDITOR-24.
- Задача 4 — місце стану змін у редакторі: AC-EDITOR-25.
- AC-EDITOR-03 (змінений) уже виконано: повідомлення «Version N saved» показано після збереження.
