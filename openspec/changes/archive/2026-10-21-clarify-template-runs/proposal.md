# Пропозиція: уточнення запуску шаблону й прогресу запуску після відповідей PM

## Why

PM відповів на питання розробників і оновив обидві вимоги першого зрізу (WS6): додав 12 нових AC, уточнив 4 наявні й
переніс відповіді в «Припущення». Специфікація має відповідати новому тексту PM, інакше реалізація розійдеться з
вимогами, а `npm run ac:coverage` попереджає про 12 неперекладених AC.

Джерела (знімок 2026-10-21):

- `requirements/2-launch-a-template-for-a-case.md` — solomchaak/property-workflows-spec#2 (`> Джерело:
  https://github.com/solomchaak/property-workflows-spec/issues/2 · оновлено 2026-10-20T16:11:36Z`);
- `requirements/3-complete-tasks-and-track-run-progress.md` — solomchaak/property-workflows-spec#3 (`> Джерело:
  https://github.com/solomchaak/property-workflows-spec/issues/3 · оновлено 2026-10-20T16:11:41Z`);
- `requirements/product.md` — solomchaak/property-workflows-spec#1 (матриця прав: email менеджерів і адміністраторів).

Рішення PM, з яких походять зміни: https://github.com/solomchaak/property-workflows-spec/issues/4,
https://github.com/solomchaak/property-workflows-spec/issues/5, https://github.com/solomchaak/property-workflows-spec/issues/6,
https://github.com/solomchaak/property-workflows-spec/issues/7, https://github.com/solomchaak/property-workflows-spec/issues/8,
https://github.com/solomchaak/property-workflows-spec/issues/9, https://github.com/solomchaak/property-workflows-spec/issues/10,
https://github.com/solomchaak/property-workflows-spec/issues/11, https://github.com/solomchaak/property-workflows-spec/issues/12,
https://github.com/solomchaak/property-workflows-spec/issues/13, https://github.com/solomchaak/property-workflows-spec/issues/14,
https://github.com/solomchaak/property-workflows-spec/issues/15,
https://github.com/solomchaak/property-workflows-spec/issues/16, https://github.com/solomchaak/property-workflows-spec/issues/17,
https://github.com/solomchaak/property-workflows-spec/issues/18 (рядки «Журнал змін» 2026-10-20 обох вимог).

## What Changes

`run-launch`:

- MODIFIED «Незмінність запуску після змін шаблону»: запуск зберігає й позначки «required» / «optional» задач і
  секції шаблону — назви, порядок і кількість задач у кожній — такими, якими вони були в момент запуску (додано
  AC-RUN-12; AC-RUN-02 без змін).
- MODIFIED «Назва випадку»: порожнечу й межу 100 символів перевіряємо після прибирання пробілів на початку й у кінці
  (AC-RUN-03, AC-RUN-07 без змін).
- ADDED «Збереження назви випадку»: назву зберігаємо без пробілів на початку й у кінці; назва зі 100 символів і
  пробілом перед нею — коректна (AC-RUN-11).
- ADDED «Дані інших користувачів під час запуску»: у виборі виконавця менеджер бачить лише email менеджерів і
  адміністраторів (AC-RUN-10).

`run-progress`:

- MODIFIED «Позначка задачі виконаною»: вимога й AC-TASK-01, AC-TASK-02, AC-TASK-07 уточнено — задача не є останньою
  обов'язковою задачею запуску, і її позначають без підтвердження.
- MODIFIED «Завершення запуску»: позначка останньої обов'язкової задачі — лише після підтвердження, у якому видно назву
  задачі й «This cannot be undone» (AC-TASK-04 змінено: «and confirms»).
- ADDED «Скасування позначки на підтвердженні»: скасування лишає задачу «to do», а запуск «in progress» (AC-TASK-16).
- MODIFIED «Прогрес запуску»: прогрес у списку бачить кожен, кому видно запуск, зокрема виконавець (додано AC-TASK-17;
  AC-TASK-05, AC-TASK-08, AC-TASK-09 без змін).
- ADDED «Чужий запуск за прямим посиланням»: сторонній менеджер бачить «Run not found» і жодної задачі (AC-TASK-10);
  «Видимість запусків» (AC-TASK-06) без змін.
- ADDED «Задачі на сторінці запуску»: email виконавця біля кожної задачі без імен і ролей (AC-TASK-11), групи за
  секціями в порядку шаблону (AC-TASK-12), позначка «required» / «optional» (AC-TASK-15).
- ADDED «Список запусків»: завершені запуски зі статусом і прогресом (AC-TASK-13), від новіших до старіших, з назвою
  випадку й назвою шаблону (AC-TASK-14).
- ADDED «Можливість позначити задачу»: можливість позначки показано лише на задачах, які користувач має право позначити
  (AC-TASK-18).

Прибраних AC немає.

## Capabilities

### New Capabilities

—

### Modified Capabilities

- `run-launch`: секції в запуску, обрізання пробілів у назві випадку, email у виборі виконавця.
- `run-progress`: підтвердження останньої обов'язкової задачі, «Run not found», сторінка й список запусків, можливість
  позначки лише на своїх задачах.

## Users & roles

Ролі `manager` і `admin` без змін (`requirements/product.md`). Новий рядок матриці прав PM: обидві ролі бачать email
менеджерів і адміністраторів — у виборі виконавця й біля задач; профілі інших користувачів, як і раніше, бачить лише
`admin`.

| Роль | Сутність | Що змінилось у цій зміні |
|---|---|---|
| `manager` | Користувач | бачить лише email менеджерів і адміністраторів, без імен і ролей (AC-RUN-10, AC-TASK-11) |
| `manager` | Запуск (Run) | чужий запуск за прямим посиланням — «Run not found» (AC-TASK-10); прогрес бачить у кожному видимому запуску (AC-TASK-17) |
| `manager`, `admin` | Задача запуску | можливість позначки — лише на задачах, які дозволено позначити (AC-TASK-18); остання обов'язкова — з підтвердженням (AC-TASK-04, AC-TASK-16) |
| `admin` | Запуск (Run) | список показує всі запуски агенції з прогресом (припущення PM) |

## Non-goals

З розділів «Поза межами» вимог #2 і #3; нове порівняно з `add-template-runs`:

- Хто й коли позначив задачу: сторінка запуску показує лише статус задачі (вимога #3, «Поза межами»).
- Екрани керування користувачами й ролями: у WS6 користувачів і ролі готують поза застосунком (продукт #1, «Що поза
  scope»; рішення PM — https://github.com/solomchaak/property-workflows-spec/issues/14).

Другий запуск того самого шаблону для того самого випадку — не Non-goal, а припущення PM (дозволено; див. Assumptions).

Рядок «Порядок секцій у шаблоні: не вимагається й не перевіряється» PM прибрав: тепер запуск зберігає порядок секцій
(AC-RUN-12, AC-TASK-12). Решта Non-goals — як у `add-template-runs`.

## Assumptions

Нові припущення PM (вимоги #2 і #3, знімок 2026-10-21):

- Пробіли на початку й у кінці назви випадку прибираються до перевірки й збереження; назва лише з пробілів — порожня.
- Запуск зберігає секції шаблону, їхні назви й порядок, а також позначки «required» / «optional» задач — такими, якими
  вони були в момент запуску.
- Момент запуску — момент, коли менеджер підтверджує запуск: запуск містить шаблон таким, яким він є в цей момент.
  Задача, додана тим часом, отримує виконавцем менеджера запуску; задачі, прибраної тим часом, у запуску немає, а
  призначення для неї відкидається.
- Другий запуск того самого шаблону для того самого випадку дозволено: кожен запуск створює рівно один незалежний запуск.
- Позначка останньої обов'язкової задачі запуску потребує підтвердження: користувач бачить назву задачі й попередження
  «This cannot be undone», і задача стає «done» лише після підтвердження. Інші задачі — без підтвердження.
- Можливість позначити задачу пропонується лише її виконавцю, менеджеру запуску й адміністратору; правило AC-TASK-03
  перевіряється й на самій дії, незалежно від того, чи запропоновано можливість.
- Список запусків адміністратора показує всі запуски агенції. У кожному рядку — назва випадку, назва шаблону, статус
  запуску й прогрес; рядки впорядковано за часом запуску, від новіших.
- Інтерфейс англійською: повідомлення, статуси й запис прогресу — дослівно як в AC і глосарії.

Робочі припущення розробника з `add-template-runs` (Q1–Q4) PM підтвердив і переніс у вимоги — окремих припущень
розробника в цій зміні немає.

## Open questions

- PM-Q1 (solomchaak/property-workflows-spec#3, «Відкриті питання»). Чи можна позначити необов'язкову задачу «to do»
  після того, як запуск став «completed»? PM: не в цьому зрізі — поведінку не специфікуємо, тести її не перевіряють.

Питання розробника Q1–Q6 (`docs/spec-reading.md`) закрито рішеннями PM: solomchaak/property-workflows-spec#5 (Q1),
solomchaak/property-workflows-spec#4 (Q2), solomchaak/property-workflows-spec#6 (Q3),
solomchaak/property-workflows-spec#18 і solomchaak/property-workflows-spec#12 (Q4), solomchaak/property-workflows-spec#8
(Q5), solomchaak/property-workflows-spec#9 (Q6).
