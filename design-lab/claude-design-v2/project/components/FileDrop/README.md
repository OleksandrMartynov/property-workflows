# FileDrop

Зона для файлів з вибором і перетягуванням, списком завантажень, прогресом і помилками. Кнопка «Choose file» є завжди (клавіатура, клік по зоні теж відкриває вибір), перетягування — додаток. Джерело — `file-drop.tsx` і розділ «File drop» у `controls.css`.

## Вигляд і стани

- Зона — пунктирна межа `input` в SVG (щоб анімувалась), `radius-md`, паддинг 24 / 16 / 20px; іконка 36px у плитці `muted`; заголовок «Drag PDF files here», рядок «PDF up to 20 MB.» (`meta`), кнопка `secondary` `sm`.
- idle — як вище; hover — межа `border-hover`.
- drag over (`data-state="dragover"`) — заливка `primary-tint`, межа `primary` «марширує» (`ctl-march`, 1200ms), плитка стає `primary` і підстрибує на 4px; заголовок «Drop to upload».
- invalid (`data-invalid`) — межа й текст ліміту `destructive`, плитка `destructive-tint`; спалахує, коли відхилили файл.
- disabled — заливка `muted`, межа `border`, кнопка `disabled`.

## Список файлів

`<ul aria-live="polite">`, рядок: плитка 32px (файл → галочка `status-done` / помилка `destructive`), назва (обрізається, повна — у `title`), під нею розмір і стан («2.4 MB · 64%», «840 KB · Uploaded»), праворуч кнопка 24px: «Cancel upload of …» під час завантаження, «Remove …» після. Прогрес — `role="progressbar"` (4px, `status-progress-mark`, стає `status-done-mark` у кінці), що розкривається під рядком пружиною. Відхилений файл лишається в списку з причиною: «Only PDF files are accepted. PDF up to 20 MB.», «File is too large (24.0 MB). PDF up to 20 MB.»; невдале завантаження: «Upload failed. Try again.».

## Поведінка й доступність

- Справжній `<input type="file">` схований візуально й несе прийняті файли в форму (`name`); відхилені туди не потрапляють.
- `accept`, `kind` (назва типу в текстах), `maxSizeMB`, `multiple`; `upload(file, { onProgress, signal })` — необов'язкове завантаження з відміною.
- Група має `role="group"` і підпис; кнопка вибору озвучується разом із підписом; помилка рівня форми — під зоною, `role="alert"`: «Attach the lease agreement».
- Рух: поява рядка — підйом 6px на `spring-smooth`, зникнення ×0.7; за reduced motion «марш» зупиняється, решта — короткий fade.

## Do / Don't

- Do: показувати ліміт типу й розміру в самій зоні; помилку файлу — у його рядку, а не лише кольором.
- Don't: приховувати кнопку «Choose file»; блокувати форму мовчки; дублювати ліміт у підказці під зоною.
