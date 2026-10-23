# Прогрес: Form controls (forms.html / forms.css / forms.js) — перша версія завершена

Джерела частинами: `D:/tmp/ws7-lab/formsparts/` (1.css–5.css, js1.js–js5.js). Збірка: `sh D:/tmp/ws7-lab/build-forms.sh`
(cat частин → `ds/forms.css`, `ds/forms.js`, `node --check`). `ds/forms.html` — окремий файл, правиться напряму.

## Готово і перевірено в браузері (headless Chrome, реальні події введення)
- forms.html: скелет за BRIEF (sprite i-*, sidebar зі scrollspy, topbar з pw-seg theme/motion), 10 секцій, галерея в light і dark поруч.
- Усі компоненти: text/textarea (автовисота до 6 рядків), password (reveal, Caps Lock), select, combobox (фільтр, підсвітка збігів,
  async, «No matches», skeleton), multi-select (чипи, FLIP, Backspace, «+N»), date / range / time (ARIA grid, місяць cross-slide,
  пресети, парсинг тексту, «Kyiv time»), number/currency (формат €1,250.00, press-and-hold з прискоренням і бейджем ×N),
  checkbox (indeterminate, група), radio, switch (async busy), segmented (ковзний індикатор), slider (single/range/bubble),
  file drop (drag-over, прогрес, помилки «PDF up to 20 MB»), field groups, validation timing demo, форма «Launch a template».
- Перевірено: клавіатура (стрілки, Home/End, PgUp/PgDn, Enter, Esc, type-ahead, Tab), закриття кліком поза поповером,
  перепозиціонування при скролі, перемикачі theme/motion, reduced motion, 390px (без горизонтального скролу), 0 помилок консолі.

## Виправлено в цьому проході
- Закриті popover-и з `display:grid` лишалися видимими (ghost) → правило `.pw-pop:not(:popover-open, [data-static]) { display:none !important }`.
- `.pw-clear`: тепер `display:none` без тексту (замість visibility:hidden — не займає місця, поза tab-порядком); статус-іконки стоять ПЕРЕД
  clear/reveal, тож blur-валідація не зсуває кнопку з-під курсора.
- Іконка next-month = `i-chev`; `.seg-page .lbl` → `.topbar .pw-seg .lbl` у media ≤560.
- Бейдж ×N степпера був обрізаний `overflow:hidden` → винесений з `.pw-num__steps`; прискорення пом'якшене (×2 після 1 s, ×5 після 2 s, ×10 після 3.2 s).
- Статичні списки в галереї без обрізання; combobox-лістинги в одну колонку; слайдер із bubble не налазить на мітку;
  `Optional` поруч із міткою, коли є tz-тег; текст перемикача по центру треку; ширина колонки Assignee у launch-формі 188 px;
  combobox у вузькому полі вирівнюється по правому краю; range-календар на вузьких екранах — 1 місяць.

## Відомі прогалини
- Caps Lock-підказку неможливо відтворити автоматично (CDP не емулює CapsLock) — перевірено лише розміткою/логікою.
- Реальний drag-and-drop файлів перевірено тільки через sample-кнопки (подія drop у headless не емулювалась).
- `forced-colors` лише на рівні токенів glass/--accent-float, окремо не проганяли.
- Токени-пропозиції `--accent-float`, `--destructive-tint` збігаються за іменем з overlays.css — дедуплікувати при переносі в tokens.css.
- Календар: `TODAY` зафіксований (пт 23 жовтня 2026) для детермінізму галереї.

## Токени-пропозиції (розділ 0 forms.css)
Геометрія: `--size-check` 16, `--size-switch-w` 32, `--size-switch-h` 20, `--size-thumb` 16, `--size-track` 4, `--size-day` 32,
`--size-listbox-max` 264, `--size-option` 32, `--size-option-rich` 44, `--size-chip` 22, `--size-popover-cal` 272, `--size-hit` 24.
Рух: `--distance-slide` 24, `--stepper-delay` 420ms, `--stepper-interval` 150ms, `--stepper-interval-min` 56ms, `--scale-thumb` 1.12.
Похідні (по темах): `--accent-float`, `--primary-tint`, `--primary-tint-strong`, `--match`, `--destructive-tint`, `--done-tint`,
`--control-off`, `--control-disabled-fill`.

## Допоміжні скрипти (не частина DS)
`D:/tmp/ws7-lab/cdp.mjs` (драйвер CDP), `forms-probe.mjs` (скріни секцій + overflow), `t1–t7.mjs` (інтеракційні тести),
`build-forms.sh`. Скріни: `D:/tmp/ds-shots/`.
