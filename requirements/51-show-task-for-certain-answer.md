> Джерело: https://github.com/solomchaak/property-workflows-spec/issues/51 · оновлено 2026-11-10T08:57:00Z

# Requirement: Show a task only for a certain answer

### Навіщо

Every run shows the same tasks, so a manager skips the tasks that do not apply. After this requirement a template has a question with fixed answers, and a task appears only for the answer it belongs to.

### Користувачі й ролі

- Manager (`manager`) — as the run manager, answers the question of a run and sees only the tasks that apply.
- Administrator (`admin`) — answers like a manager in their own runs and sees all runs.
- Vendor (`vendor`) — sees only their own tasks that are shown and does not see the question.

### Основний сценарій

1. A manager launches the template "Repair". The run shows the question "Urgency" without an answer and only the tasks that are always shown.
2. The manager answers "urgent". The task "Send an emergency plumber" appears with status "to do".
3. If the manager changes the answer to "not urgent", the task disappears; if the answer goes back to "urgent", the task appears again with status "to do".

### Критерії приймання

- AC-LOGIC-01: Given manager A and the template "Repair" with 4 tasks, one of which, "Send an emergency plumber", is shown only when the field "Urgency" is "urgent". When A launches the template for the case "Apartment 7, leak". Then the run shows the field "Urgency" without an answer and 3 tasks, and the progress is "0 of 3 done".
- AC-LOGIC-02: Given the run "Apartment 7, leak" with 3 shown tasks and the field "Urgency" without an answer, and manager A as the run manager. When A answers "Urgency" with "urgent". Then the run shows 4 tasks, the task "Send an emergency plumber" has status "to do", and the progress is "0 of 4 done".
- AC-LOGIC-03: Given a run with "Urgency" = "not urgent", 3 shown required tasks of which 2 are "done", and the required task "Send an emergency plumber" hidden. When the assignee marks the third shown task as done and confirms. Then the run has status "completed".
- AC-LOGIC-04: Given the run "Apartment 7, leak" with "Urgency" = "urgent" and the task "Send an emergency plumber" with status "done", and manager A as the run manager. When A changes "Urgency" to "not urgent" and then back to "urgent". Then the task "Send an emergency plumber" is shown with status "to do", not "done".
- AC-LOGIC-05: Given the run "Apartment 7, leak" run by manager A, and manager B who is the assignee of one task in it but not the run manager. When B tries to change the answer of "Urgency". Then the answer stays as it was, and B sees the message "Only the run manager or an administrator can change the answers".

### Поза межами

- An editor for fields and conditions: they are prepared outside the application, as initial data.
- Field types other than "choice", several conditions on one item, "and/or" and "not equal".
- Using an answer in the text of a task, in a document or in a message.
- A confirmation before a changed answer resets a task.
- Parsing a document by AI (slice WS10).

### Припущення

- The field "Urgency" has exactly the answers "urgent" and "not urgent"; a field without an answer counts as not matching any condition, so its conditional task stays hidden.
- A "done" mark is final, except that a changed answer returns a dependent task to "to do" (AC-LOGIC-04).
- A hidden required task does not count in the progress and does not block the completion of the run.
- Fields and conditions are prepared by the administrator as initial data; a run keeps the field, the condition and the answer it was launched with.
- The interface is in English: messages and statuses are shown exactly as written in the acceptance criteria.
- All dates and times in the application are shown in Kyiv time; this requirement has no time rules.
- The data is for training: object names and users are fictional (`*@example.test`).

### Відкриті питання

Немає.

### Журнал змін

- 2026-11-10 — created
