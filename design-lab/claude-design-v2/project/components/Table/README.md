# Table

Щільна таблиця списків (запуски, шаблони) з рядками 44px; у рядку живуть ProgressRing, AvatarStack і StatusBadge, у картці деталей — ProgressBar. Джерело — `table.tsx`, `progress-ring.tsx`, `progress.tsx`, `avatar.tsx`, `avatar-stack.tsx`.

## Таблиця

- Частини: `Table` (контейнер із `overflow-x: auto`, `radius-md`, межа `border`, тло `card`, `elevation-1`), `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`.
- Шапка: тло `muted` 50%, нижня межа `border`; заголовок колонки — `meta` (12/16) вагою 500 у `muted-foreground`, висота 32px (`scope="col"`).
- Клітинка: висота 44px, горизонтальний паддинг 16px, `vertical-align: middle`. Між рядками — `border`, в останнього межі немає.
- `interactive` рядок: hover — `state-hover`. Перехід робить посилання з `rowLinkClass` у першій клітинці: псевдоелемент розтягується на весь рядок, фокус — outline `ring` усередині (`offset -2px`).
- Перша колонка — назва (`font-weight: 500`, `foreground`) і під нею `meta` у `muted-foreground` (шаблон); решта колонок — `muted-foreground`. Довгий текст («Next task») обрізається до 224px.
- Колонки списку запусків: Run · Run manager · Progress · Next task · Assignees · Status.

## ProgressRing

Кільце 16px (24px у картці): трек `border-strong` 45%, дуга `primary` із заокругленим кінцем; на завершенні — суцільна `status-done-mark` із галочкою кольору `background`. Дуга змінюється за `duration-slow` і `ease-in-out-soft`. Число словами («2 of 5 done», `tabular-nums`) стоїть поруч завжди; саме кільце — `aria-hidden`.

## ProgressBar

Смужка 4px (`radius-pill`) на треку `muted`; заповнення — `primary`, а коли `done >= total` — `status-done-mark`. Живе в картці деталей запуску поруч із кільцем і числом. Смужка `aria-hidden`: число словами обов'язкове.

## Avatar і AvatarStack

- `Avatar` — коло 20px з ініціалом адреси (10px, вага 600). Тон береться з хешу адреси з п'яти пар `status-progress`, `status-done`, `status-due-soon`, `ai`, `variable` (тло + `-foreground`): тон нічого не означає, лише відрізняє людей між сторінками. Ім'я чи email завжди поруч або в `title`; сам Avatar — `aria-hidden`.
- `AvatarStack` — ініціали, що перекриваються на 6px (кільце 2px кольору `card` між ними); до `max` (3 за замовчуванням) і далі «+N» (`meta`, вага 500). Повний список — у `title`. Порожній список — «—».

## Що дає споживач

Колонки й дані. Прогрес — «N of M done» (рахує база). Статус — `StatusBadge`. Менеджер «я» — слово «me». Виконавці — масив email.

## Do / Don't

- Do: статус із іконкою й словом; числа з `tabular-nums`; один рядок — одне посилання.
- Don't: вкладені посилання в рядку; тінь на рядках; статус-заливка на весь рядок; кільце чи смужка без числа поруч.
