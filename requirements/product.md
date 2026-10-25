> Джерело: https://github.com/solomchaak/property-workflows-spec/issues/1 · оновлено 2026-10-25T13:18:10Z

# Product

### Бачення

Problem: a residential property management agency runs its repeatable processes (repairs, move-ins, invoicing) in a general-purpose process tool. It does not scale to the agency's volumes, and it lacks what property management specifically needs.
Who it is for: the administrator and the property managers of one agency.
The first slice solved only part of this problem: a repeatable process is started from a ready-made template, and the progress of every run is visible.
The second slice (WS7) lets the administrator manage templates in the application: edit a template (changes are kept automatically), save it as a numbered version, and see which version every run follows. All pages follow one design system. Later slices add vendors, run variables and conditions, AI document parsing, and a status page for the person who submitted a request.
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

### Користувачі й ролі

Two roles work in the first two slices. Users are created by the administrator: invitation emails are not sent in the training project. The tenant has no portal. The vendor (`vendor`) appears in a later slice; in these slices there is no such user or role.

| Role (identifier) | Who | How the role is assigned |
|---|---|---|
| `manager` | property manager: launches and runs processes; as an assignee, is responsible for the tasks assigned to them and marks them as done | assigned by the administrator |
| `admin` | administrator: configures templates and users; also launches templates, runs their own runs and can be the assignee of a task | only by another administrator; cannot change their own role |

A user is always created together with exactly one role, chosen by the administrator at that moment. A user without a role does not exist, and a user can have only one role at a time.

### Матриця прав

| Action | manager | admin |
|---|---|---|
| See own profile | yes | yes |
| See other users' profiles | —, because users are managed only by the administrator | yes |
| See the email of managers and administrators (assignee picker, next to tasks) | yes | yes |
| Create users and assign roles | —, because users and roles are managed only by the administrator | yes, except their own role |
| See templates | yes, only templates saved as a version, and only their current version | yes, all templates, including unpublished changes |
| Create a template, edit it and save it as a new version | —, because templates are configured only by the administrator | yes |
| See the list of versions of a template | —, because managers work only with the current version | yes |
| See which template version a run follows | yes, in the runs they can see | yes, in all runs |
| Launch a template | yes | yes |
| Assign a task's assignee at launch | only in the run they create | only in the run they create |
| See runs | only runs where they are the run manager or the assignee of at least one task | all |
| Mark a task as done | only tasks where they are the assignee, and all tasks of their own runs | all tasks in all runs |

A visitor who is not signed in sees only the sign-in page, because the application is internal and shows nothing without signing in.

Decisions about roles:
- Only an administrator assigns and changes roles, and only for another user.
- Nobody can change their own role, so nobody can raise their own role; this includes administrators.
- Because a role is changed only by another administrator, the last administrator can never lose their role.
- A manager cannot change anyone's role.
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
| Assignee | The manager or administrator a task in a run is assigned to; each task has exactly one assignee | executor, performer, responsible |
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

### Roadmap зрізів

| Workshop | Slice (what the user can do) | Requirements | Status |
|---|---|---|---|
| WS6 | a manager launches a template for a case and sees progress; an assignee marks their tasks as done | "Requirement: Launch a template for a case", "Requirement: Complete tasks and track run progress" | done |
| WS7 | an administrator edits a template (changes are kept automatically) and saves it as a numbered version; a run keeps the version it was launched from; managers never see unpublished changes; all pages share one design system | "Requirement: Use one design system across the application", "Requirement: Edit a template with version control" | in progress |
| WS8 | a manager assigns a vendor to a task; the vendor sees and works only on the tasks assigned to them; each role's access is enforced in the database | — | planned |
| WS9 | a task or a field in a run appears or is hidden depending on answers (run variables and conditions); a changed answer resets the steps that depend on it | — | planned |
| WS10 | an administrator adds an "AI document parsing" step to a template; in a run the AI proposes values from a document, and the user confirms or corrects them before they are saved | — | planned |
| WS11 | the person who submitted a request sees its status on a page opened by a link, without an account; optionally the request is submitted through a public form | — | planned |

### Що поза scope

- Emails to users: developers have free-tier email — 2 emails per hour, and only to members of their own project. Reminders are an in-app marker, an "invitation" is a link from the administrator.
- Starting runs on a schedule or through a webhook, task deadlines and overdue marks.
- Integration with a property accounting system (tenants, tasks, bills, payments, charges): not part of this course. The training project has no real keys or external systems; vendors and properties are entered as initial data or imported from a file.
- PDF documents (estimates, invoices, run reports), margin calculation and owner approval.
- Notifications to tenants, vendors and owners beyond an in-app marker.
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

Density: tables are dense, because a manager scans many runs at once, but stay readable on a phone. The case name, status and progress come first; secondary columns can move below on a narrow screen.

Texts: plain English, addressed to the user, no slang. Buttons start with a verb: "Launch", "Save". Examples: empty state "No runs yet. Launch a template to start one."; error "A template needs at least one required task"; success "Version 2 saved". Messages written in the acceptance criteria are used word for word.

Accessibility: high contrast, everything works from the keyboard, the focused element is always visible.

What does not fit: bright gradients, decorative animation, small grey text, icons without a label, pop-ups for routine information.
