> Джерело: https://github.com/solomchaak/property-workflows-spec/issues/1 · оновлено 2026-10-19T16:13:08Z

# Product

### Бачення

Problem: a residential property management agency runs its repeatable processes (repairs, move-ins, invoicing) in a general-purpose process tool. It does not scale to the agency's volumes, and it lacks what property management specifically needs.
Who it is for: the administrator and the property managers of one agency.
The first slice solves only part of this problem: a repeatable process is started from a ready-made template, and the progress of every run is visible. Property-specific capabilities (vendors, external forms, PDF, AI) come in later slices.
Success signs of the first slice:
- a manager launches a template for a specific case, and the run contains all tasks of the template, each with exactly one assignee;
- for every run you can see how many tasks out of how many are done, and which ones are done and which are not;
- an assignee marks their own tasks as done; only the run manager or an administrator can mark someone else's task;
- several runs of the same template are in progress at the same time, each with its own progress and its own assignees.

### Користувачі й ролі

Two roles work in this slice. Users are created by the administrator: invitation emails are not sent in the training project. The tenant has no portal. The vendor (`vendor`) appears in later slices; in this slice there is no such user or role.

| Role (identifier) | Who | How the role is assigned |
|---|---|---|
| `manager` | property manager: launches and runs processes; as an assignee, is responsible for the tasks assigned to them and marks them as done | assigned by the administrator |
| `admin` | administrator: configures templates and users; also launches templates, runs their own runs and can be the assignee of a task | only by another administrator; cannot change their own role |

### Матриця прав

| Action | manager | admin |
|---|---|---|
| See own profile | yes | yes |
| See other users' profiles | — | yes |
| Create users and assign roles | — | yes, except their own role |
| See templates | yes | yes |
| Create and change templates | — | yes |
| Launch a template | yes | yes |
| Assign a task's assignee at launch | only in the run they create | only in the run they create |
| See runs | only runs where they are the run manager or the assignee of at least one task | all |
| Mark a task as done | only tasks where they are the assignee, and all tasks of their own runs | all tasks in all runs |

### Глосарій

| Term | Definition | Avoid |
|---|---|---|
| Template | A blueprint of a process: sections with tasks. Created by the administrator. Also known as a workflow | scenario, procedure |
| Section | A group of tasks in a template that has a name and an order | block, stage, part |
| Task | A single step in a template and in a run; can be required or optional | todo, step, job |
| Required task | A task marked as required in the template; a run cannot be completed without it being done | critical, main |
| Run | One instance of a template for a specific case, with its own tasks, status and progress | instance, execution, process (for an instance) |
| Case | The specific situation a run is created for; has a free-form name, for example "Apartment 12, move-in" | ticket, request |
| Run manager | The user (manager or administrator) who created a run and runs it | owner, responsible |
| Assignee | The manager or administrator a task in a run is assigned to; each task has exactly one assignee | executor, performer, responsible |
| Task status | "to do" or "done" | state |
| Run status | "in progress" or "completed" | state |
| Progress | A record of the form "N of M done", where N is the number of tasks with status "done" and M is all tasks of the run, required or not | percentage, % complete |
| Manager | A user with the role `manager` | property manager, dispatcher |
| Administrator | A user with the role `admin` | admin, superuser |

### Roadmap зрізів

| Workshop | Slice (what the user can do) | Requirements | Status |
|---|---|---|---|
| WS6 | a manager launches a template for a case and sees progress; an assignee marks their tasks as done | "Requirement: Launch a template for a case", "Requirement: Complete tasks and track run progress" | in progress |
| WS7 | a task in a template appears or is hidden depending on answers in the run form | — | planned |
| WS8 | a manager picks a vendor from a directory and gives them access only to the tasks assigned to them | — | planned |
| WS9 | a template is launched not only manually: on a schedule (at most once a day) and through an external form with a public link | — | planned |
| WS10 | parsing an incoming request into run variables and a draft of estimate line items | — | planned |
| WS11 | a PDF of an estimate or an invoice is generated from run data | — | planned |

### Що поза scope

- Emails to users: developers have free-tier email — 2 emails per hour, and only to members of their own project. Reminders are an in-app marker, an "invitation" is a link from the administrator.
- Scheduled actions more often than once a day.
- Integration with a property accounting system: the training project has no real keys or external systems; later slices will use a stub or a file import.
- Incoming email on a dedicated address as a trigger: it does not exist on free tiers; it is replaced by an external form or a webhook in later slices.
- Tenant portal: the tenant does not use the application; their case is entered by a manager.
