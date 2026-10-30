> Джерело: https://github.com/solomchaak/property-workflows-spec/issues/1 · оновлено 2026-10-30T07:15:08Z

# Product

### Бачення

Problem: a residential property management agency runs its repeatable processes (repairs, move-ins, invoicing) in a general-purpose process tool. It does not scale to the agency's volumes, and it lacks what property management specifically needs.
Who it is for: the administrator and the property managers of one agency.
The first slice solved only part of this problem: a repeatable process is started from a ready-made template, and the progress of every run is visible.
The second slice (WS7) lets the administrator manage templates in the application: edit a template (changes are kept automatically), save it as a numbered version, and see which version every run follows. All pages follow one design system. The third slice (WS8) adds the vendor: an outside contractor who sees and works only on the tasks assigned to them. Later slices add run variables and conditions, AI document parsing, and a status page for the person who submitted a request.
Success signs of the first slice:
- a manager launches a template for a specific case, and the run contains all tasks of the template, each with exactly one assignee;
- for every run you can see how many tasks out of how many are done, and which ones are done and which are not;
- an assignee marks their own tasks as done; only the run manager or an administrator can mark someone else's task;
- several runs of the same template are in progress at the same time, each with its own progress and its own assignees.
Success signs of the second slice:
- an administrator changes a template and saves it as a new version, and runs started earlier keep the version they were launched from;
- managers see only saved versions of templates, never unpublished changes;
- a manager or a visitor who is not signed in cannot change a template or see its versions, whether through the pages or by sending the request directly;
- statuses, messages and empty lists look and read the same on every page.
Success signs of the third slice:
- a manager assigns a vendor to a task when launching a template, and the vendor marks that task as done;
- a vendor sees only the runs where a task is assigned to them, and in those runs only their own tasks;
- a vendor cannot see or change anything else, whether through the pages or by sending the request directly.

### Користувачі й ролі

Three roles work in the application. Users are created by the administrator: invitation emails are not sent in the training project. The tenant has no portal. The vendor (`vendor`) appears from the third slice (WS8).

| Role (identifier) | Who | How the role is assigned |
|---|---|---|
| `manager` | property manager: launches and runs processes; as an assignee, is responsible for the tasks assigned to them and marks them as done | assigned by the administrator |
| `admin` | administrator: configures templates and users; also launches templates, runs their own runs and can be the assignee of a task | only by another administrator; cannot change their own role |
| `vendor` | vendor: an outside contractor; sees only the runs where a task is assigned to them and, in those runs, only their own tasks; marks their own tasks as done | assigned by the administrator when the user is created |

A user is always created together with exactly one role, chosen by the administrator at that moment. A user without a role does not exist, and a user can have only one role at a time.

### Матриця прав

| Action | manager | admin | vendor |
|---|---|---|---|
| See own profile | yes | yes | yes |
| See other users' profiles | —, because users are managed only by the administrator | yes | —, because a vendor works only with their own tasks |
| See the email of other users (assignee picker, next to tasks) | yes, of managers, administrators and vendors | yes, of managers, administrators and vendors | —, because a vendor must not see who else works on the agency's runs |
| Create users and assign roles | —, because users and roles are managed only by the administrator | yes, except their own role | —, because users and roles are managed only by the administrator |
| See templates | yes, only templates saved as a version, and only their current version | yes, all templates, including unpublished changes | —, because a vendor does not work with templates |
| Create a template, edit it and save it as a new version | —, because templates are configured only by the administrator | yes | —, because templates are configured only by the administrator |
| See the list of versions of a template | —, because managers work only with the current version | yes | —, because a vendor does not work with templates |
| See which template version a run follows | yes, in the runs they can see | yes, in all runs | —, because a vendor sees only their own tasks of a run |
| Launch a template | yes | yes | —, because a vendor does not start processes |
| Assign a task's assignee at launch | only in the run they create | only in the run they create | —, because a vendor does not launch templates |
| See runs | only runs where they are the run manager or the assignee of at least one task | all | only runs where they are the assignee of at least one task, and in those runs only their own tasks |
| Mark a task as done | only tasks where they are the assignee, and all tasks of their own runs | all tasks in all runs | only tasks where they are the assignee |

A visitor who is not signed in sees only the sign-in page, because the application is internal and shows nothing without signing in.

Every limit in this matrix is enforced where the data lives, not only on the pages: an action or data that a role is not allowed cannot be reached in any other way, including a request sent directly, not through the pages of the application. Such a request is refused, nothing is changed and nothing about the data is disclosed.

Decisions about roles:
- Only an administrator assigns and changes roles, and only for another user.
- Nobody can change their own role, so nobody can raise their own role; this includes administrators.
- Because a role is changed only by another administrator, the last administrator can never lose their role.
- A manager cannot change anyone's role.
- A vendor is a user like the others: the administrator creates them with the role `vendor`; a vendor never becomes a run manager and never changes any role.
- In the training project users and roles are prepared as initial data; whether the application has a screen for it is up to the developer.

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
| Assignee | The manager, administrator or vendor a task in a run is assigned to; each task has exactly one assignee | executor, performer, responsible |
| Task status | "to do" or "done" | state |
| Run status | "in progress" or "completed" | state |
| Progress | A record of the form "N of M done", where N is the number of tasks with status "done" and M is all tasks of the run, required or not | percentage, % complete |
| Manager | A user with the role `manager` | property manager, dispatcher |
| Administrator | A user with the role `admin` | admin, superuser |
| Unpublished changes | Changes to a template that are kept automatically but have not been saved as a new version yet; visible only to administrators; a run is never launched from them | draft, working copy |
| Version | A numbered state of a template (1, 2, 3…) created when the administrator saves the template; it never changes afterwards | revision, edition, release |
| Current version | The latest saved version of a template; the one a manager launches | active version, live version |
| Editor | The pages where the administrator edits a template and saves it as a new version | builder, designer |
| Design system | The single set of looks and behaviours (statuses, colours, messages, page layout) that every page of the application follows | theme, skin, style guide |
| Vendor | A user with the role `vendor`: an outside contractor who sees only the runs where a task is assigned to them and, in those runs, only their own tasks | contractor, supplier, subcontractor |

### Roadmap зрізів

| Workshop | Slice (what the user can do) | Requirements | Status |
|---|---|---|---|
| WS6 | a manager launches a template for a case and sees progress; an assignee marks their tasks as done | "Requirement: Launch a template for a case", "Requirement: Complete tasks and track run progress" | done |
| WS7 | an administrator edits a template (changes are kept automatically) and saves it as a numbered version; a run keeps the version it was launched from; managers never see unpublished changes; all pages share one design system | "Requirement: Use one design system across the application", "Requirement: Edit a template with version control" | done |
| WS8 | a manager assigns a vendor to a task when launching a template; the vendor sees and works only on the tasks assigned to them; each role's access is enforced in the database | "Requirement: Assign a vendor and let the vendor work on their own tasks" | WS9 — конвеєр |
| WS9 | a task or a field in a run appears or is hidden depending on answers (run variables and conditions); a changed answer resets the steps that depend on it | — | planned |
| WS10 | an administrator adds an "AI document parsing" step to a template; in a run the AI proposes values from a document, and the user confirms or corrects them before they are saved | — | planned |
| WS11 | the person who submitted a request sees its status on a page opened by a link, without an account; optionally the request is submitted through a public form | — | planned |

### Що поза scope

- Emails to users: developers have free-tier email — 2 emails per hour, and only to members of their own project. Reminders are an in-app marker, an "invitation" is a link from the administrator.
- Starting runs on a schedule or through a webhook, task deadlines and overdue marks.
- Integration with a property accounting system (tenants, tasks, bills, payments, charges): not part of this course. The training project has no real keys or external systems; vendors and properties are entered as initial data or imported from a file.
- PDF documents (estimates, invoices, run reports), margin calculation and owner approval.
- Notifications to tenants, vendors and owners beyond an in-app marker.
- Vendor actions beyond marking their own tasks as done: accepting or declining a task, a visit date, uploading estimates, photos and invoices, returning a declined task to the manager.
- Incoming email on a dedicated address as a trigger: it does not exist on free tiers. In WS10 a user pastes or uploads the text of a request; an external form is optional in WS11.
- Tenant account or portal: the tenant has no account. Until WS11 their case is entered by a manager; from WS11 they only see a status page opened by a link.
- User and role management screens: users and roles are prepared outside the application (for example as initial data).
- Retiring a template, opening an older version of a template to read it, comparing two versions and restoring an older version: not planned in the current Roadmap.

### Вигляд і тон

Tone: calm, businesslike, precise. The application helps a busy manager get through a long list of cases. Avoid jokes, exclamation marks, blame ("You made a mistake") and jargon.

Colours, by meaning:
- The main action of a screen (Launch, Save) gets one strong accent colour, used for nothing else.
- Dangerous or irreversible actions get a clearly different warning colour and always ask for confirmation, with the notice "This cannot be undone".
- Statuses: "to do" neutral grey, "in progress" blue, "done" and "completed" green, "Unpublished changes" warm yellow, errors red.
- A status is never shown by colour alone: the status text is always next to it.

Themes: the application has a light and a dark theme. The user chooses System (default, follows the device), Light or Dark. Statuses keep their words and colours by meaning in both themes, with high contrast.

Density: tables are dense, because a manager scans many runs at once, but stay readable on a phone. The case name, status and progress come first; secondary columns can move below on a narrow screen.

Texts: plain English, addressed to the user, no slang. Buttons start with a verb: "Launch", "Save". Examples: empty state "No runs yet. Launch a template to start one."; error "A template needs at least one required task"; success "Version 2 saved". Messages written in the acceptance criteria are used word for word.

Accessibility: high contrast, everything works from the keyboard, the focused element is always visible.

What does not fit: bright gradients, decorative animation, small grey text, icons without a label, pop-ups for routine information.

### Як доводимо

How each criterion of slices 1 and 2 is proved. "e2e" means a browser test that goes through the screen; "база" means a test of the data rule without a screen; "unit" means a test of a calculation. Nothing is proved "вручну": every criterion can be automated.

| AC ID | Як доводимо | Чому |
|---|---|---|
| AC-RUN-01 | e2e | a manager launches a template and sees the run with its tasks on the screen |
| AC-RUN-02 | база + e2e | a run keeps its tasks in the data; the page of the run shows them |
| AC-RUN-03 | e2e | the message "Enter a case name" is seen on the form |
| AC-RUN-04 | e2e | assignees chosen at launch are seen next to the tasks |
| AC-RUN-05 | e2e | an administrator launches a template and is the run manager |
| AC-RUN-06 | e2e | the launching manager becomes the run manager |
| AC-RUN-07 | e2e + unit | the message is seen on the form; the 100-character border is a calculation |
| AC-RUN-08 | e2e | default assignee is seen next to all tasks |
| AC-RUN-09 | e2e | default assignee for an administrator is seen next to all tasks |
| AC-RUN-10 | e2e | the assignee picker with emails only is on the screen |
| AC-RUN-11 | unit + e2e | trimming of spaces is a calculation; the saved name is seen on the screen |
| AC-RUN-12 | база + e2e | the run keeps its sections in the data; the page of the run groups them |
| AC-TASK-01 | e2e | the assignee marks a task and the status is seen |
| AC-TASK-02 | e2e | the run manager marks a task and the status is seen |
| AC-TASK-03 | база + e2e | the message is seen; "who may mark" is also checked on the action itself |
| AC-TASK-04 | e2e + unit | the completion of the run is seen; the rule "all required tasks done" is a calculation |
| AC-TASK-05 | e2e | the progress "2 of 5 done" is on the run page |
| AC-TASK-06 | база + e2e | which runs a user sees is a data rule; the list is on the screen |
| AC-TASK-07 | e2e | an administrator marks a task and the status is seen |
| AC-TASK-08 | e2e | the status of each task is on the run page |
| AC-TASK-09 | e2e | the progress is in the list of runs |
| AC-TASK-10 | база + e2e | the message "Run not found" is seen; the tasks are not read from the data |
| AC-TASK-11 | e2e | the emails next to the tasks are on the screen |
| AC-TASK-12 | e2e | the grouping by sections is on the screen |
| AC-TASK-13 | e2e | completed and in-progress runs are in the list |
| AC-TASK-14 | e2e | the order and the names in the list of runs are on the screen |
| AC-TASK-15 | e2e | the marks "required" and "optional" are on the screen |
| AC-TASK-16 | e2e | cancelling at the confirmation is a screen action |
| AC-TASK-17 | e2e | the progress for an assignee is in the list of runs |
| AC-TASK-18 | база + e2e | the option on own tasks is seen; the rule is also checked on the action itself |
| AC-DSYS-01 | e2e | statuses and colours are seen on the pages |
| AC-DSYS-02 | e2e | the message and the link are seen on the page |
| AC-DSYS-03 | e2e | the sign-in page for a visitor is seen |
| AC-DSYS-04 | e2e | the empty list message is seen |
| AC-DSYS-05 | e2e | the device appearance is emulated in the browser and the theme is seen |
| AC-DSYS-06 | e2e | the choice is kept after reopening the page on the same device |
| AC-DSYS-07 | e2e + unit | the colours are seen; the contrast ratio is a calculation |
| AC-DSYS-08 | e2e | the landing page after sign-in is seen |
| AC-EDITOR-01 | e2e | the notice and the kept task are seen in the editor |
| AC-EDITOR-02 | e2e | the manager sees the saved version only |
| AC-EDITOR-03 | e2e + база | the message is seen; the new version in the data |
| AC-EDITOR-04 | e2e | the message and the kept template are seen |
| AC-EDITOR-05 | e2e | the list of versions is on the screen |
| AC-EDITOR-06 | база + e2e | the run keeps its version in the data; "Template version 1" is on the page |
| AC-EDITOR-07 | e2e | the message is seen on the page |
| AC-EDITOR-08 | база | a direct request has no screen: a test of the data rule |
| AC-EDITOR-09 | e2e | the sign-in page for a visitor is seen |
| AC-EDITOR-10 | e2e | the unavailable template and the note are in the launch form |
| AC-EDITOR-11 | база | a direct launch has no screen: a test that no run is created |
| AC-EDITOR-12 | база | a direct save has no screen: a test that no version is created |
| AC-EDITOR-13 | e2e | the confirmation and the kept item are seen |
| AC-EDITOR-14 | e2e | the removal is seen; the saved version keeps the item |
| AC-EDITOR-15 | e2e | the message and the kept changes are seen |
| AC-EDITOR-16 | e2e | the message "Template not found" is seen |
| AC-EDITOR-17 | e2e | the empty list message is seen |
| AC-EDITOR-18 | e2e | the empty list of versions message is seen |
| AC-EDITOR-19 | e2e | the message is seen on the form |
| AC-EDITOR-20 | e2e | the message and the kept changes are seen |
| AC-EDITOR-21 | e2e + база | the new name is seen in the list; it is stored with the version |
| AC-EDITOR-22 | база + e2e | the run keeps the name in the data; the list shows it |
| AC-EDITOR-23 | e2e | the message is seen on the form |
| AC-EDITOR-24 | e2e | the message and the kept changes are seen |
| AC-EDITOR-25 | e2e | the lost connection is emulated in the browser and the message is seen |
| AC-EDITOR-26 | база | a direct request has no screen: a test of the data rule |
| AC-EDITOR-27 | база | the migration of old runs is a data check |
| AC-EDITOR-28 | e2e | moving a task is a screen action; the new version is seen |
| AC-EDITOR-29 | база | a direct request has no screen: a test of the data rule |
