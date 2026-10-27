# Tasks

Вертикальні задачі: UI + дія + база + тест. Одна задача — одна гілка `task/<коротко>` і один PR «Реалізація».
Перевірка — `npm test`, `npm run ac:coverage`, `npm run check:design`, `npm run check:copy`.

## 1. Тема й повернення після входу

- [ ] 1.1 Вибір «Theme» (System / Light / Dark) у вікні акаунта й на вході; `data-theme` на `<html>` до першого кадру;
  темні токени для `prefers-color-scheme` і `data-theme="dark"`; збереження на пристрої.
- [ ] 1.2 `?next=` у proxy й `requireViewer()`, приховане поле форми входу, `safeNext()` у дії входу.
- [ ] 1.3 Тести: вибір теми з пристроєм і збереженим значенням, контраст статусів темної теми, `safeNext()` (зокрема
  спроби відкритого редіректу); мутаційна перевірка `safeNext()`.
  Done when: AC-DSYS-05, AC-DSYS-06, AC-DSYS-07, AC-DSYS-08.

## 2. Сторінка шаблону й стани

- [ ] 2.1 Сторінка `/templates/[id]` лише для читання, «Template not found», недоступний шаблон у формі запуску,
  порожні стани списку шаблонів і версій.
- [ ] 2.2 Тести з AC ID на наявну поведінку (запуск і збереження без версії чи змін, секція без задач, відвідувач без
  входу, запуски до версій, прямі запити менеджера) і нові тести перейменування, назви запуску й перенесення задачі;
  кожен відмовний тест перевіряє і відмову, і незмінні дані; мутаційна перевірка.
  Done when: AC-EDITOR-02, AC-EDITOR-10, AC-EDITOR-11, AC-EDITOR-12, AC-EDITOR-13, AC-EDITOR-14, AC-EDITOR-15,
  AC-EDITOR-16, AC-EDITOR-17, AC-EDITOR-18, AC-EDITOR-21, AC-EDITOR-22, AC-EDITOR-26, AC-EDITOR-27, AC-EDITOR-28,
  AC-EDITOR-29.

## 3. Правила назв

- [ ] 3.1 Міграція: унікальність назви шаблону без урахування регістру й пробілів на краях; перевірка при створенні й
  при збереженні перейменованого шаблону; порожні назви секцій і задач у незбережених змінах — відмова при збереженні.
- [ ] 3.2 Дії й повідомлення «Enter a template name», «A template with this name already exists», «Every section and
  task needs a name»; тести бази й дій; мутаційна перевірка.
- [ ] 3.3 Регресія: нові перевірки `save_template_version` не ламають відмову AC-EDITOR-04 («A template needs at least
  one required task», версії немає, незбережені зміни лишаються) — наявні тести AC-EDITOR-04 зелені, порядок відмов —
  як у `design.md`.
  Done when: AC-EDITOR-19, AC-EDITOR-20, AC-EDITOR-23, AC-EDITOR-24 (і AC-EDITOR-04 без регресії).

## 4. Стан змін у редакторі

- [ ] 4.1 Фіксоване місце стану («All changes kept» / «Saving…» / «Your last change was not kept. Try again.»), дії з
  клієнта в `try/catch`, введений текст лишається; тести логіки стану й компонента.
  Done when: AC-EDITOR-25.
