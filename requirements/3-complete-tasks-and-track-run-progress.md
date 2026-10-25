> Джерело: https://github.com/solomchaak/property-workflows-spec/issues/3 · оновлено 2026-10-25T13:12:13Z

# Requirement: Complete tasks and track run progress

### Навіщо

A manager cannot see which tasks of a run are done and which are not, and assignees have no clear rule on who may mark a task. After this requirement, an assignee marks their tasks as done, the run manager sees the progress, and a run completes by itself when all required tasks are done.

### Користувачі й ролі

- Assignee (a manager or an administrator a task is assigned to) — marks their own tasks as done, sees the runs where they have tasks.
- Run manager (a manager or an administrator who created the run) — sees the progress and the status of every task, and can mark any task of their run as done.
- Administrator (`admin`) — sees all runs and can mark any task in any run as done.
- Any other manager who is neither the assignee nor the run manager does not see this run and cannot change it.

### Основний сценарій

1. The run manager opens the list of their runs and sees the progress "N of M done" for each.
2. The run manager opens a run and sees the progress and the status of each task.
3. An assignee opens a run in which they have a task and sees the status of all tasks of the run.
4. The assignee marks their task as done.
5. When all required tasks are done, the run gets status "completed".

### Критерії приймання

- AC-TASK-01: Given a run with status "in progress", a task with status "to do" that is not the last required task of the run, the task's assignee is manager B, the run manager is manager A. When manager B marks this task as done. Then the task has status "done".
- AC-TASK-02: Given a run with status "in progress", a task with status "to do" that is not the last required task of the run, the task's assignee is manager B, the run manager is manager A. When manager A marks this task as done. Then the task has status "done".
- AC-TASK-03: Given a run of manager A, a task with status "to do" whose assignee is manager B, and manager C, who is neither the run manager of this run nor the assignee of this task. When manager C tries to mark this task as done. Then the task stays "to do", and manager C sees the message "Only the task's assignee, the run manager, or an administrator can mark a task as done".
- AC-TASK-04: Given a run "in progress" with 5 tasks, 3 of which are required; 2 required tasks are already "done", the remaining 3 tasks are "to do". When the assignee marks the third required task as done and confirms. Then the run has status "completed".
- AC-TASK-05: Given a run with 5 tasks, 2 of which have status "done", and the run manager. When the run manager opens this run. Then they see the progress "2 of 5 done".
- AC-TASK-06: Given three runs: two are run by manager A, one by manager B, and manager B is the assignee of one task in the first run of manager A. When manager B opens the list of runs. Then they see 2 runs: their own and the first run of manager A in which they are an assignee; they do not see the second run of manager A.
- AC-TASK-07: Given a run of manager A, a task with status "to do" that is not the last required task of the run, whose assignee is manager B, and an administrator who did not create this run. When the administrator marks this task as done. Then the task has status "done".
- AC-TASK-08: Given a run with 5 tasks, 2 "done" and 3 "to do", and the run manager. When the run manager opens this run. Then they see for each of the 5 tasks whether it is "done" or "to do".
- AC-TASK-09: Given a run of manager A with 5 tasks, 2 of them "done", and manager A. When manager A opens the list of their runs. Then this run is shown with the progress "2 of 5 done".
- AC-TASK-10: Given a run of manager A and manager C, who is neither the run manager of this run nor an assignee in it. When manager C opens the page of this run by a direct link. Then manager C sees the message "Run not found" and none of the tasks of the run.
- AC-TASK-11: Given a run of manager A with a task assigned to manager B, and manager B. When manager B opens this run. Then manager B sees next to each task the email of its assignee, and no names or roles.
- AC-TASK-12: Given a run created from a template with the sections "Before move-in" (2 tasks) and "Move-in day" (3 tasks), and the run manager. When the run manager opens this run. Then the tasks are shown in two groups: first "Before move-in" with its 2 tasks, then "Move-in day" with its 3 tasks.
- AC-TASK-13: Given manager A with one run "completed" (4 of 5 tasks "done", 1 optional task "to do") and one run "in progress". When manager A opens the list of runs. Then both runs are shown, each with its run status and its progress; the completed one as "completed" and "4 of 5 done".
- AC-TASK-14: Given manager A who launched the template "Tenant move-in" for the case "Apartment 12" and later the template "Repair" for the case "Apartment 12". When manager A opens the list of runs. Then the "Repair" run is shown first and the "Tenant move-in" run second, each row with its case name and its template name.
- AC-TASK-15: Given a run with 5 tasks, 3 required and 2 optional, and the run manager. When the run manager opens this run. Then each task is marked "required" or "optional" next to its status: 3 tasks "required" and 2 "optional".
- AC-TASK-16: Given a run "in progress" with 3 required tasks, 2 of them "done", and the third required task "to do" assigned to manager B. When manager B chooses to mark the third required task as done and cancels at the confirmation. Then the task stays "to do", and the run stays "in progress".
- AC-TASK-17: Given a run of manager A with 5 tasks, 2 of them "done", and manager B, who is the assignee of one task in this run. When manager B opens the list of runs. Then this run is shown with the progress "2 of 5 done".
- AC-TASK-18: Given a run of manager A with a task assigned to manager B and a task assigned to manager C, and manager C. When manager C opens this run. Then the option to mark a task as done is offered on the task assigned to manager C and not on the task assigned to manager B.

### Поза межами

- Undoing the "done" mark: in this slice the mark is final.
- Task comments, attachments, notifying an assignee about a new task: the assignee sees the new task in the list of runs.
- Deadlines, overdue tasks, "my tasks" as a separate screen, and a dashboard with a summary by runs (later slices).
- Approvals and sign-offs of tasks.
- Manual change of a run's status: it changes only through completing tasks.
- Who marked a task and when: the run page shows only the status of a task.

### Припущення

- A run is "completed" when all its required tasks are "done"; optional tasks do not affect the run status, and completing a run does not change the status of its optional tasks.
- Progress counts all tasks of the run, required or not.
- A task is marked as done once: a second attempt to mark an already "done" task changes nothing, and the task stays "done".
- Marking the last required task of a run as done asks for confirmation: the user sees the task name and the notice "This cannot be undone", and the task becomes "done" only after confirmation. Marking any other task needs no confirmation.
- The option to mark a task as done is offered to its assignee, to the run manager and to an administrator only; the rule of AC-TASK-03 is also checked on the action itself, whether or not the option is offered.
- The list of runs of an administrator shows all runs of the agency. Every row shows the case name, the template name, the run status and the progress; the rows are ordered by launch time, newest first.
- The interface is in English: messages, statuses and the progress record are shown exactly as written in the acceptance criteria and in the glossary.
- All users and runs are fictional (`*@example.test`); this requirement has no time rules, and the time in the application is Kyiv time.
- The run manager is the assignee of all tasks that are not assigned to someone else (see "Requirement: Launch a template for a case").
- An administrator can mark any task in any run as done, regardless of the assignee and the run manager.
- A user who is the assignee of at least one task of a run sees the statuses of all tasks of that run, not only their own.

### Відкриті питання

- Q1. A run becomes "completed" when all required tasks are done, but it may still contain optional tasks that are "to do". Can one of them be marked as done after the run is completed? (not in this slice: we do not specify this behavior; developers' tests do not check it.)

### Журнал змін

- 2026-10-19 — created
- 2026-10-19 — AC-TASK-04 and AC-TASK-05 reworded; AC-TASK-08 and AC-TASK-09 added; progress is shown both in the list of runs and on the run page; an administrator can be an assignee; a repeated "done" mark changes nothing — own PM decision
- 2026-10-20 — AC-TASK-10 to AC-TASK-18 added (run not found, emails next to tasks, tasks grouped by section, completed runs and progress in the list, template name and ordering in the list, required/optional marker, cancel at the confirmation of the last required task, progress for an assignee, the mark-as-done option only on a user's own tasks); assumptions added on the confirmation for the last required task, the administrator's list and the interface language; the run page shows only the status of a task — https://github.com/solomchaak/property-workflows-spec/issues/4, https://github.com/solomchaak/property-workflows-spec/issues/5, https://github.com/solomchaak/property-workflows-spec/issues/7, https://github.com/solomchaak/property-workflows-spec/issues/10, https://github.com/solomchaak/property-workflows-spec/issues/11, https://github.com/solomchaak/property-workflows-spec/issues/12, https://github.com/solomchaak/property-workflows-spec/issues/13, https://github.com/solomchaak/property-workflows-spec/issues/15, https://github.com/solomchaak/property-workflows-spec/issues/17, https://github.com/solomchaak/property-workflows-spec/issues/18
- 2026-10-20 — AC-TASK-01, AC-TASK-02 and AC-TASK-07: the task is not the last required task of the run, because the confirmation is asked only for the last required task — own PM decision (self-check against the checklist)
