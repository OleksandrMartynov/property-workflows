> Джерело: https://github.com/solomchaak/property-workflows-spec/issues/3 · оновлено 2026-10-19T16:20:06Z

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

- AC-TASK-01: Given a run with status "in progress", a task with status "to do", the task's assignee is manager B, the run manager is manager A. When manager B marks this task as done. Then the task has status "done".
- AC-TASK-02: Given a run with status "in progress", a task with status "to do", the task's assignee is manager B, the run manager is manager A. When manager A marks this task as done. Then the task has status "done".
- AC-TASK-03: Given a run of manager A, a task with status "to do" whose assignee is manager B, and manager C, who is neither the run manager of this run nor the assignee of this task. When manager C tries to mark this task as done. Then the task stays "to do", and manager C sees the message "Only the task's assignee, the run manager, or an administrator can mark a task as done".
- AC-TASK-04: Given a run "in progress" with 5 tasks, 3 of which are required; 2 required tasks are already "done", the remaining 3 tasks are "to do". When the assignee marks the third required task as done. Then the run has status "completed".
- AC-TASK-05: Given a run with 5 tasks, 2 of which have status "done", and the run manager. When the run manager opens this run. Then they see the progress "2 of 5 done".
- AC-TASK-06: Given three runs: two are run by manager A, one by manager B, and manager B is the assignee of one task in the first run of manager A. When manager B opens the list of runs. Then they see 2 runs: their own and the first run of manager A in which they are an assignee; they do not see the second run of manager A.
- AC-TASK-07: Given a run of manager A, a task with status "to do" whose assignee is manager B, and an administrator who did not create this run. When the administrator marks this task as done. Then the task has status "done".
- AC-TASK-08: Given a run with 5 tasks, 2 "done" and 3 "to do", and the run manager. When the run manager opens this run. Then they see for each of the 5 tasks whether it is "done" or "to do".
- AC-TASK-09: Given a run of manager A with 5 tasks, 2 of them "done", and manager A. When manager A opens the list of their runs. Then this run is shown with the progress "2 of 5 done".

### Поза межами

- Undoing the "done" mark: in this slice the mark is final.
- Task comments, attachments, notifying an assignee about a new task: the assignee sees the new task in the list of runs.
- Deadlines, overdue tasks, "my tasks" as a separate screen, and a dashboard with a summary by runs (later slices).
- Approvals and sign-offs of tasks.
- Manual change of a run's status: it changes only through completing tasks.

### Припущення

- A run is "completed" when all its required tasks are "done"; optional tasks do not affect the run status, and completing a run does not change the status of its optional tasks.
- Progress counts all tasks of the run, required or not.
- A task is marked as done once: a second attempt to mark an already "done" task changes nothing, and the task stays "done".
- All users and runs are fictional (`*@example.test`); this requirement has no time rules, and the time in the application is Kyiv time.
- The run manager is the assignee of all tasks that are not assigned to someone else (see "Requirement: Launch a template for a case").
- An administrator can mark any task in any run as done, regardless of the assignee and the run manager.
- A user who is the assignee of at least one task of a run sees the statuses of all tasks of that run, not only their own.

### Відкриті питання

- Q1. A run becomes "completed" when all required tasks are done, but it may still contain optional tasks that are "to do". Can one of them be marked as done after the run is completed? (not in this slice: we do not specify this behavior; developers' tests do not check it.)

### Журнал змін

- 2026-10-19 — created
- 2026-10-19 — AC-TASK-04 and AC-TASK-05 reworded; AC-TASK-08 and AC-TASK-09 added; progress is shown both in the list of runs and on the run page; an administrator can be an assignee; a repeated "done" mark changes nothing — own PM decision
