## ADDED Requirements

### Requirement: Необов'язкова задача завершеного запуску

WHEN виконавець позначає виконаною необов'язкову задачу зі статусом «to do» у запуску зі статусом «completed», the system SHALL встановити задачі статус «done», лишити запуску статус «completed» і врахувати задачу як виконану в прогресі.

#### Scenario: AC-TASK-19 Необов'язкова задача після завершення запуску

- **GIVEN** запуск зі статусом «completed», у якому необов'язкова задача «Order a part» має статус «to do», і виконавець цієї задачі
- **WHEN** виконавець позначає «Order a part» виконаною
- **THEN** the task has status "done", the run stays "completed"
- **AND** the progress counts the task as done.
