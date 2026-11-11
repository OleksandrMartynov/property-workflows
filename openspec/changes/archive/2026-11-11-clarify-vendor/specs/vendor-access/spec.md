## MODIFIED Requirements

### Requirement: Підрядник не позначає чужу задачу напряму

IF підрядник напряму, оминаючи сторінки застосунку, намагається позначити виконаною задачу, виконавець якої — не він, THEN the system SHALL відхилити запит, лишити задачу в статусі «to do» і повернути підряднику повідомлення «Only the task's assignee, the run manager, or an administrator can mark a task as done».

#### Scenario: AC-VENDOR-07 Прямий запит на задачу менеджера

- **GIVEN** запуск «Apartment 12, move-in», у якому задача 1 призначена менеджеру A, а задачі 3 і 4 — підряднику V
- **WHEN** V намагається позначити задачу 1 виконаною напряму, оминаючи сторінки застосунку
- **THEN** task 1 stays "to do"
- **AND** V gets the message "Only the task's assignee, the run manager, or an administrator can mark a task as done".

### Requirement: Підрядник не бачить шаблонів

IF підрядник відкриває список шаблонів за прямим посиланням, THEN the system SHALL показати повідомлення «Not enough rights» і посилання «Back to runs» і не показувати жодного шаблону.

#### Scenario: AC-VENDOR-08 Список шаблонів за прямим посиланням

- **GIVEN** підрядник V, який увійшов
- **WHEN** V відкриває список шаблонів за прямим посиланням
- **THEN** V sees the message "Not enough rights" and the link "Back to runs"
- **AND** no template.

## ADDED Requirements

### Requirement: Сторінка запуску підрядника

WHEN підрядник відкриває запуск, у якому він виконавець, the system SHALL показати назву випадку як заголовок сторінки й запис «Your tasks: N of K done» і не показувати статусу запуску, назви шаблону й версії шаблону.

#### Scenario: AC-VENDOR-11 Заголовок і прогрес на сторінці запуску підрядника

- **GIVEN** підрядник V, виконавець задач 3 («done») і 4 («to do») у запуску «Apartment 12, move-in» з 5 задачами
- **WHEN** V відкриває цей запуск
- **THEN** V sees the case name "Apartment 12, move-in" as the title of the page and "Your tasks: 1 of 2 done"
- **AND** does not see the run status, the template name or the template version.

### Requirement: Рядок списку запусків підрядника без назви шаблону

WHEN підрядник відкриває список запусків, the system SHALL показати в рядку кожного запуску назву випадку, статус запуску й запис «Your tasks: N of K done» і не показувати назви шаблону.

#### Scenario: AC-VENDOR-12 Рядок запуску без назви шаблону

- **GIVEN** підрядник V, виконавець 2 задач у запуску «Apartment 12, move-in», запущеному з шаблону «Tenant move-in»
- **WHEN** V відкриває список запусків
- **THEN** the row of this run shows the case name, the run status and "Your tasks: 0 of 2 done"
- **AND** does not show the template name "Tenant move-in".

### Requirement: Навігація й перша сторінка підрядника

WHEN підрядник входить, the system SHALL показати йому список запусків і навігацію лише з пунктами «Runs» і «Profile».

#### Scenario: AC-VENDOR-13 Вхід підрядника

- **GIVEN** підрядник V, виконавець 2 задач у запуску «Apartment 12, move-in»
- **WHEN** V входить
- **THEN** V sees the list of runs
- **AND** the navigation shows only "Runs" and "Profile".

### Requirement: Закриті сторінки шаблонів для підрядника

IF підрядник відкриває за прямим посиланням форму запуску, сторінку шаблону, список версій або редактор, THEN the system SHALL показати повідомлення «Not enough rights» і посилання «Back to runs» і не показувати жодного вмісту шаблону.

#### Scenario: AC-VENDOR-14 Сторінки шаблону за прямим посиланням

- **GIVEN** підрядник V, який увійшов
- **WHEN** V відкриває форму запуску, сторінку шаблону, список версій або редактор за прямим посиланням
- **THEN** V sees the message "Not enough rights" and the link "Back to runs"
- **AND** no content of the template.

### Requirement: Прямий запит на задачу запуску без задач підрядника

IF підрядник напряму, оминаючи сторінки застосунку, намагається позначити виконаною задачу запуску, у якому в нього немає задач, THEN the system SHALL відхилити запит, лишити задачу в статусі «to do» і повернути підряднику повідомлення «Run not found».

#### Scenario: AC-VENDOR-15 Прямий запит на задачу чужого запуску

- **GIVEN** запуск «Apartment 14, repair», у якому підрядник V не має задач, а задача 1 призначена менеджеру A
- **WHEN** V намагається позначити задачу 1 виконаною напряму, оминаючи сторінки застосунку
- **THEN** task 1 stays "to do"
- **AND** V gets the message "Run not found".

### Requirement: Необов'язкова задача підрядника в завершеному запуску

WHEN підрядник позначає виконаною свою необов'язкову задачу зі статусом «to do» у запуску зі статусом «completed», the system SHALL встановити задачі статус «done», показати підряднику оновлений запис «Your tasks: N of K done» і лишити запуску статус «completed».

#### Scenario: AC-VENDOR-16 Необов'язкова задача після завершення запуску

- **GIVEN** запуск «Apartment 12, move-in» зі статусом «completed», у якому підрядник V — виконавець необов'язкової задачі 3 зі статусом «to do»
- **WHEN** V позначає задачу 3 виконаною
- **THEN** task 3 has status "done", V sees "Your tasks: 1 of 1 done"
- **AND** the run stays "completed".

### Requirement: Прямий запит задач запуску підрядником

WHEN підрядник напряму, оминаючи сторінки застосунку, запитує задачі запуску, у якому він виконавець, the system SHALL повернути лише задачі, призначені йому.

#### Scenario: AC-VENDOR-17 Прямий запит задач запуску

- **GIVEN** підрядник V, виконавець задач 3 і 4 у запуску «Apartment 12, move-in» з 5 задачами
- **WHEN** V запитує задачі цього запуску напряму, оминаючи сторінки застосунку
- **THEN** V receives only tasks 3 and 4.

### Requirement: Прямі запити підрядника про інших користувачів і чужі запуски

IF підрядник напряму, оминаючи сторінки застосунку, запитує email і профілі інших користувачів або задачі запуску, у якому в нього немає задач, THEN the system SHALL не повертати нічого про інших користувачів і про цей запуск.

#### Scenario: AC-VENDOR-18 Прямі запити про інших користувачів і чужий запуск

- **GIVEN** підрядник V, виконавець задач 3 і 4 у запуску «Apartment 12, move-in» і жодної задачі в запуску «Apartment 14, repair»
- **WHEN** V напряму, оминаючи сторінки застосунку, запитує email і профілі інших користувачів і задачі «Apartment 14, repair»
- **THEN** V receives nothing about other users or about "Apartment 14, repair".
