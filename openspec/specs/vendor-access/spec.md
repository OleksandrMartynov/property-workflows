# vendor-access Specification

## Purpose
Робота підрядника (`vendor`) із задачами, які йому призначено під час запуску шаблону: підрядник бачить лише
запуски, де в нього є задачі, у них — лише свої задачі, позначає їх виконаними й не бачить і не змінює нічого іншого ні на сторінках, ні прямим запитом.

## Requirements

### Requirement: Список запусків підрядника

WHEN підрядник відкриває список запусків, the system SHALL показати лише запуски, де він виконавець хоча б однієї задачі, кожен з назвою випадку, статусом запуску й записом «Your tasks: N of K done», де K — кількість задач цього запуску, призначених підряднику, а N — ті з них, що мають статус «done».

#### Scenario: AC-VENDOR-03 Підрядник бачить лише запуск зі своїми задачами

- **GIVEN** підрядник V, виконавець 2 задач у запуску «Apartment 12, move-in» і жодної задачі в запуску «Apartment 14, repair»
- **WHEN** V відкриває список запусків
- **THEN** V sees only the run "Apartment 12, move-in" with its run status and "Your tasks: 0 of 2 done"
- **AND** does not see "Apartment 14, repair".

### Requirement: Підрядник бачить лише свої задачі запуску

WHEN підрядник відкриває запуск, у якому він виконавець, the system SHALL показати лише задачі, призначені йому, кожну з назвою, секцією, позначкою «required» або «optional» і статусом, і не показувати інших задач запуску, email інших користувачів і прогресу всього запуску.

#### Scenario: AC-VENDOR-04 Підрядник бачить задачі 3 і 4

- **GIVEN** підрядник V, виконавець задач 3 і 4 у запуску «Apartment 12, move-in» з 5 задачами
- **WHEN** V відкриває цей запуск
- **THEN** V sees exactly tasks 3 and 4, each with its name, its section, the mark "required" or "optional" and its status
- **AND** does not see tasks 1, 2 and 5, the emails of other users or the progress of the whole run.

### Requirement: Підрядник позначає свою задачу виконаною

WHEN підрядник позначає виконаною свою задачу зі статусом «to do», яка не є останньою обов'язковою задачею запуску, the system SHALL встановити задачі статус «done» і показати підряднику оновлений запис «Your tasks: N of K done».

#### Scenario: AC-VENDOR-05 Підрядник позначає задачу 3

- **GIVEN** підрядник V, виконавець задачі 3 зі статусом «to do», яка не є останньою обов'язковою задачею запуску «Apartment 12, move-in»
- **WHEN** V позначає задачу 3 виконаною
- **THEN** task 3 has status "done"
- **AND** V sees "Your tasks: 1 of 2 done".

### Requirement: Запуск без задач підрядника за прямим посиланням

IF підрядник відкриває за прямим посиланням сторінку запуску, у якому в нього немає задач, THEN the system SHALL показати повідомлення «Run not found» і не показувати жодної задачі цього запуску.

#### Scenario: AC-VENDOR-06 Чужий запуск за прямим посиланням

- **GIVEN** запуск «Apartment 14, repair», у якому підрядник V не має задач
- **WHEN** V відкриває сторінку цього запуску за прямим посиланням
- **THEN** V sees the message "Run not found"
- **AND** none of the tasks of the run.

### Requirement: Підрядник не позначає чужу задачу напряму

IF підрядник напряму, оминаючи сторінки застосунку, намагається позначити виконаною задачу, виконавець якої — не він, THEN the system SHALL відхилити запит і лишити задачу в статусі «to do».

#### Scenario: AC-VENDOR-07 Прямий запит на задачу менеджера

- **GIVEN** запуск «Apartment 12, move-in», у якому задача 1 призначена менеджеру A, а задачі 3 і 4 — підряднику V
- **WHEN** V намагається позначити задачу 1 виконаною напряму, оминаючи сторінки застосунку
- **THEN** task 1 stays "to do".

### Requirement: Підрядник не бачить шаблонів

IF підрядник відкриває список шаблонів за прямим посиланням, THEN the system SHALL показати повідомлення «Not enough rights» і не показувати жодного шаблону.

#### Scenario: AC-VENDOR-08 Список шаблонів за прямим посиланням

- **GIVEN** підрядник V, який увійшов
- **WHEN** V відкриває список шаблонів за прямим посиланням
- **THEN** V sees the message "Not enough rights"
- **AND** no template.

### Requirement: Підрядник не запускає шаблон напряму

IF підрядник напряму, оминаючи сторінки застосунку, намагається запустити шаблон, THEN the system SHALL не створювати запуск і не змінювати список запусків.

#### Scenario: AC-VENDOR-09 Прямий запуск шаблону підрядником

- **GIVEN** підрядник V, який увійшов, і шаблон «Tenant move-in» з поточною версією 1
- **WHEN** V намагається запустити цей шаблон напряму, оминаючи сторінки застосунку
- **THEN** no run is created
- **AND** the list of runs does not change.

### Requirement: Порожній список запусків підрядника

WHEN підрядник, якому не призначено жодної задачі, відкриває список запусків, the system SHALL показати повідомлення «No tasks assigned to you yet.» без порожньої таблиці.

#### Scenario: AC-VENDOR-10 Підрядник без задач

- **GIVEN** підрядник V, якому не призначено жодної задачі
- **WHEN** V відкриває список запусків
- **THEN** V sees the message "No tasks assigned to you yet."
- **AND** no empty table.
