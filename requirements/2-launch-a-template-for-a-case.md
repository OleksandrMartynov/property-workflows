> Джерело: https://github.com/solomchaak/property-workflows-spec/issues/2 · оновлено 2026-10-19T16:20:04Z

# Requirement: Launch a template for a case

### Навіщо

The agency's managers run repairs, move-ins and other repeatable processes by hand and cannot see what has been done. After this requirement, a manager (or an administrator) takes a ready-made template, launches it for a specific case, distributes the tasks among managers, and gets a run that keeps the template exactly as it was at the moment of launch.

### Користувачі й ролі

- Manager (`manager`) — launches a template for a case, becomes the run manager, and assigns assignees to tasks. Can see templates but cannot change them.
- Administrator (`admin`) — creates and changes templates; can also launch a template, and then becomes the run manager and assigns assignees. Can also be the assignee of a task.

### Основний сценарій

1. A manager (or an administrator) picks a template and enters a case name, for example "Apartment 12, move-in".
2. If needed, the run manager assigns another user (a manager or an administrator) as the assignee of individual tasks. For the remaining tasks the assignee is the run manager.
3. A run is created with status "in progress": all tasks of the template have status "to do".
4. Later changes to the template by an administrator do not change this run.

### Критерії приймання

- AC-RUN-01: Given a template "Tenant move-in" with 2 sections and 5 tasks, 3 of which are required, and manager A. When manager A launches this template for the case "Apartment 12, move-in". Then exactly one run is created with status "in progress", and the run contains all 5 tasks with status "to do".
- AC-RUN-02: Given a run created from the template "Tenant move-in" with 5 tasks, and the run manager. When the template is changed (a sixth task is added and the first task is renamed) and the run manager then opens the run. Then the run still contains exactly 5 tasks with their original names.
- AC-RUN-03: Given manager A and a template with 5 tasks. When manager A launches the template with the case name empty or consisting only of spaces. Then no run is created, and manager A sees the message "Enter a case name".
- AC-RUN-04: Given a template with 5 tasks and managers A and B. When manager A launches the template and assigns manager B as the assignee of two tasks. Then those 2 tasks have manager B as the assignee, and the remaining 3 tasks have manager A.
- AC-RUN-05: Given an administrator and the template "Tenant move-in" with 5 tasks. When the administrator launches this template for the case "Apartment 14, move-in". Then exactly one run is created, and the run manager is this administrator.
- AC-RUN-06: Given the template "Tenant move-in" and manager A. When manager A launches it for the case "Apartment 12, move-in". Then manager A is the run manager of the created run.
- AC-RUN-07: Given manager A and a template with 5 tasks. When manager A launches the template with a case name of 101 characters. Then no run is created, and manager A sees the message "Case name must be at most 100 characters".
- AC-RUN-08: Given a template with 5 tasks and manager A. When manager A launches the template without assigning any assignees. Then manager A is the assignee of all 5 tasks.
- AC-RUN-09: Given a template with 5 tasks and an administrator. When the administrator launches the template without assigning any assignees. Then the administrator is the assignee of all 5 tasks.

### Поза межами

- Conditional logic: a task is always present in a run and cannot be hidden depending on answers (slice WS7).
- Changing the assignee of an already launched task: assignees are set only at launch.
- Deleting and cancelling a run.
- Vendors as assignees and guest access (slice WS8): the assignee can only be a manager or an administrator.
- Task deadlines and reminders.
- Creating and changing templates in the interface: an administrator may prepare templates outside the application, for example as initial data; whether there is a screen for it is up to the developer.
- Section order in a template: it is not required and not checked.

### Припущення

- Templates already exist: they are prepared by the administrator, and every task of a template has a "required" or "optional" flag. Every template has at least one required task.
- Users with the roles `manager` and `admin` are created by the administrator.
- An administrator who launched a template acts as the run manager and assigns assignees. An administrator can be the assignee of a task.
- The case name is free text of 1 to 100 characters; a name consisting only of spaces counts as empty.
- Tasks of a run can be done in any order: order is not a constraint.
- All dates and times in the application are shown in Kyiv time; this slice has no time-dependent rules.
- The data is for training: object names and users are fictional (`*@example.test`).

### Відкриті питання

Немає.

### Журнал змін

- 2026-10-19 — created
- 2026-10-19 — AC-RUN-01, AC-RUN-02, AC-RUN-03, AC-RUN-05 reworded; AC-RUN-06 to AC-RUN-09 added; an administrator can be an assignee; case name limited to 100 characters; Q1 and Q2 resolved and moved to "Припущення" and "Поза межами" — own PM decision
