> Джерело: https://github.com/solomchaak/property-workflows-spec/issues/20 · оновлено 2026-10-25T13:22:51Z

# Requirement: Edit a template with version control

### Навіщо

An administrator cannot change a template in the application, so every change means preparing data outside it, and nobody can tell which version of a process a run follows. After this requirement an administrator edits a template and saves it as a numbered version; until then the changes are kept, but managers keep working with the last saved version. The administrator sees the list of versions, and runs that were already started are not affected and show the version they follow.

### Користувачі й ролі

- Administrator (`admin`) — the only role that changes templates: creates them, edits sections and tasks, saves a new version and sees the list of versions of any template.
- Manager (`manager`) — sees only saved templates in their current version and the version of the runs they can see; cannot open the editor, never sees unsaved changes and does not see the list of versions.
- A visitor who is not signed in sees only the sign-in page.

### Основний сценарій

1. An administrator opens the list of templates, and either creates a new template with a name or opens an existing one in the editor.
2. The administrator adds, renames, reorders and removes sections and tasks, and marks each task as required or optional. Every change is kept automatically, so nothing is lost if the administrator leaves without saving. While the template is not saved, it shows the notice "Unpublished changes".
3. The administrator saves the template. A new version is created: version 1 for a new template, the next number for an existing one. The notice disappears.
4. The administrator opens the list of versions and sees every version with its number, the date and the author, newest first.
5. A manager launches the template. The run follows the version that was current at the moment of launch and shows its number; later versions do not change it.

### Критерії приймання

- AC-EDITOR-01: Given administrator A and the template "Tenant move-in" with current version 1 (2 sections, 5 tasks). When A opens the editor, adds a sixth task "Sign handover act" to the section "Move-in day" and leaves the editor without saving. Then A sees the notice "Unpublished changes" on the template, and when A opens the editor again, the template has 6 tasks.
- AC-EDITOR-02: Given administrator A who added a sixth task to "Tenant move-in" and left the editor without saving, and manager B. When B opens the template. Then B sees version 1 with 5 tasks and no notice about unpublished changes.
- AC-EDITOR-03: Given administrator A and "Tenant move-in" with unpublished changes (6 tasks) made from current version 1. When A saves the template. Then version 2 with 6 tasks becomes the current version of the template, and the notice "Unpublished changes" disappears.
- AC-EDITOR-04: Given administrator A and a new template "Repair" with 1 section and 3 tasks, all 3 optional, that has never been saved as a version. When A saves it. Then A sees the message "A template needs at least one required task", no version is created, and the template keeps its 1 section, its 3 tasks and the notice "Unpublished changes".
- AC-EDITOR-05: Given the template "Tenant move-in" with version 1 (saved 05.10.2026 09:30 by administrator A) and version 2 (saved 12.10.2026 14:05 by administrator C), and administrator A. When A opens the list of versions of this template. Then A sees version 2 first with "12.10.2026 14:05" and the email of C, and version 1 second with "05.10.2026 09:30" and the email of A.
- AC-EDITOR-06: Given the template "Tenant move-in" with version 1 (5 tasks) and current version 2 (6 tasks), and a run launched by manager A from version 1. When A opens this run. Then A sees "Template version 1" and the 5 tasks of version 1.
- AC-EDITOR-07: Given manager B signed in and the template "Tenant move-in" with versions 1 and 2. When B opens the list of versions of this template by a direct link. Then B sees the message "Not enough rights" and no versions.
- AC-EDITOR-08: Given manager B signed in and the template "Tenant move-in" with current version 1 (5 tasks). When B tries to change this template or save a new version directly, bypassing the pages of the application. Then the template stays at version 1 with 5 tasks and has no unpublished changes.
- AC-EDITOR-09: Given a visitor who is not signed in. When the visitor opens the editor of the template "Tenant move-in" by a direct link. Then the visitor sees the sign-in page and no content of the template.

### Поза межами

- Fields in tasks, run variables, conditions, assignment rules and deadlines in the editor: later slices; the editor in this slice works only with sections, tasks and the required/optional mark.
- Deleting a template and retiring a template.
- Opening an older version to read it, comparing two versions and restoring an older version.
- Two administrators editing the same template at the same time.
- Approval of a new version by another person: the administrator who saves a version publishes it.
- Importing templates from a file.

### Припущення

- Users with the roles `manager` and `admin` are created by the administrator, who chooses the role at the moment of creation; in the training project they are prepared as initial data. A user without a role does not exist.
- Only administrators change templates; every administrator may change any template.
- Changes are kept automatically while the administrator edits, and saving the template creates a version. A template has one set of unpublished changes at a time, shared by all administrators: whoever opens the editor continues from it.
- Unpublished changes are not a version, are not shown in the list of versions and are never shown to managers.
- Version numbers are whole numbers 1, 2, 3… in order of saving; a number is never reused, and a saved version never changes.
- A saved version becomes the current version for all later launches; a run already launched keeps the version it was launched from (see "Requirement: Launch a template for a case").
- A new template that has never been saved as a version is shown to administrators with the notice "Unpublished changes" and is not shown to managers.
- The version of a run is shown as "Template version N" on the page of the run.
- The list of versions shows only the number, the date and time of saving and the email of the administrator who saved it. Dates and times are in Kyiv time, in the form DD.MM.YYYY HH:MM, to the minute.
- Section and task names are free text; limits on their length are not part of this slice.
- The interface is in English: messages and statuses are shown exactly as written in the acceptance criteria and in the glossary.
- The data is for training: object names and users are fictional (`*@example.test`).

### Відкриті питання

- Q1. Can an administrator discard the unpublished changes and return to the current version? (not in this slice: developers may offer it; tests do not check it.)

### Журнал змін

- 2026-10-25 — created
