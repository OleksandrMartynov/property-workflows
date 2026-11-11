# Пропозиція: уточнення зрізу 3 після відповідей PM (підрядник)

## Why

PM відповів на питання до зрізу 3 (solomchaak/property-workflows-spec#41…#50) і 2026-11-10 змінив вимогу
`requirements/39-assign-a-vendor-own-tasks.md` (solomchaak/property-workflows-spec#39, знімок 2026-11-11) і
`requirements/3-complete-tasks-and-track-run-progress.md` (solomchaak/property-workflows-spec#3): додав AC-VENDOR-11…18 і
AC-TASK-19, переформулював AC-VENDOR-07 і AC-VENDOR-08 і додав припущення. Специфікація має повторити їх з тими самими ID
і дослівним «Тоді».

Журнал змін PM:
- 2026-11-10 — AC-VENDOR-11 to AC-VENDOR-18 added; AC-VENDOR-07 and AC-VENDOR-08 reworded; assumptions added —
  https://github.com/solomchaak/property-workflows-spec/issues/41 … https://github.com/solomchaak/property-workflows-spec/issues/50
- 2026-11-10 — AC-TASK-19 added; Q1 resolved and removed — https://github.com/solomchaak/property-workflows-spec/issues/46

## What Changes

- `vendor-access`:
  - MODIFIED «Підрядник не позначає чужу задачу напряму» (AC-VENDOR-07): у «Тоді» додано повідомлення «Only the task's
    assignee, the run manager, or an administrator can mark a task as done».
  - MODIFIED «Підрядник не бачить шаблонів» (AC-VENDOR-08): у «Тоді» додано посилання «Back to runs».
  - ADDED: сторінка запуску підрядника — назва випадку як заголовок і «Your tasks: N of K done», без статусу запуску,
    назви й версії шаблону (AC-VENDOR-11); рядок списку запусків без назви шаблону (AC-VENDOR-12); навігація лише «Runs»
    і «Profile», після входу — список запусків (AC-VENDOR-13); форма запуску, сторінка шаблону, список версій і
    редактор — «Not enough rights» і «Back to runs» (AC-VENDOR-14); прямий запит на задачу запуску без його задач —
    «Run not found» (AC-VENDOR-15); необов'язкова задача завершеного запуску (AC-VENDOR-16); прямий запит задач запуску —
    лише свої (AC-VENDOR-17); прямі запити про інших користувачів і чужий запуск — нічого (AC-VENDOR-18).
- `run-progress`: ADDED «Необов'язкова задача завершеного запуску» (AC-TASK-19).

## Capabilities

### New Capabilities

Немає.

### Modified Capabilities

- `vendor-access` — MODIFIED 2 вимоги (AC-VENDOR-07, AC-VENDOR-08), ADDED 8 вимог (AC-VENDOR-11…18).
- `run-progress` — ADDED 1 вимога (AC-TASK-19).

## Users & roles

Без змін (`requirements/product.md`, матриця прав): менеджер (`manager`), адміністратор (`admin`), підрядник
(`vendor`). Підрядник бачить власний профіль («See own profile» — yes) і не бачить профілів інших користувачів.

## Non-goals

З «Поза межами» PM: прийняття чи відхилення задачі підрядником, дата візиту, кошториси, фото й рахунки, зміна виконавця
після запуску, запрошення й гостьовий доступ, сповіщення, довідник підрядників, запуск і редагування шаблонів
підрядником. Зміна ролі користувача в застосунку — поза зрізом (припущення PM).

## Assumptions

Припущення PM (requirements/39, requirements/3, нові 2026-11-10):
- Підрядник бачить на сторінці запуску назву випадку як заголовок і «Your tasks: N of K done», без статусу запуску,
  назви й версії шаблону; рядок списку запусків — назва випадку, статус запуску й «Your tasks: N of K done», без назви
  шаблону.
- Навігація підрядника — лише «Runs» і «Profile»; після входу — список запусків.
- Кожна сторінка, яку підряднику не можна відкрити (форма запуску, список і сторінка шаблону, список версій, редактор),
  показує «Not enough rights» і посилання «Back to runs».
- Роль у застосунку в цьому зрізі не змінюється: `vendor` задають під час створення користувача.
- Необов'язкову задачу завершеного запуску ще можна позначити виконаною, зокрема підряднику; запуск лишається
  «completed».

(розробник) «Profile» у навігації — пункт, що веде до власного профілю (матриця прав «See own profile»); його вигляд
визначає `impl-` план.

## Open questions

Немає: питання solomchaak/property-workflows-spec#41…#50 PM закрив цією зміною вимоги.
