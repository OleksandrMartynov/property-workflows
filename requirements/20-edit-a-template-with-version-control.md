> Джерело: https://github.com/solomchaak/property-workflows-spec/issues/20 · оновлено 2026-10-27T10:09:16Z

# Requirement: Edit a template with version control

### Навіщо

An administrator cannot change a template in the application, so every change means preparing data outside it, and nobody can tell which version of a process a run follows. After this requirement an administrator edits a template and saves it as a numbered version; until then the changes are kept, but managers keep working with the last saved version. The administrator sees the list of versions, and runs that were already started are not affected and show the version they follow.

### Користувачі й ролі

- Administrator (`admin`) — the only role that changes templates: creates them, edits sections and tasks, saves a new version and sees the list of versions of any template.
- Manager (`manager`) — sees only saved templates in their current version and the version of the runs they can see; cannot open the editor, never sees unsaved changes and does not see the list of versions.
- A visitor who is not signed in sees only the sign-in page.

### Основний сценарій

1. An administrator opens the list of templates, and either creates a new template with a name or opens an existing one in the editor.
2. The administrator adds, renames, reorders and removes sections and tasks, moves a task to another section, renames the template, and marks each task as required or optional. Every change is kept automatically, so nothing is lost if the administrator leaves without saving. While the template is not saved, it shows the notice "Unpublished changes".
3. The administrator saves the template. A new version is created: version 1 for a new template, the next number for an existing one. The notice disappears.
4. The administrator opens the list of versions and sees every version with its number, the date and the author, newest first.
5. A manager launches the template. The run follows the version that was current at the moment of launch and shows its number; later versions do not change it.

### Критерії приймання

- AC-EDITOR-01: Given administrator A and the template "Tenant move-in" with current version 1 (2 sections, 5 tasks). When A opens the editor, adds a sixth task "Sign handover act" to the section "Move-in day" and leaves the editor without saving. Then A sees the notice "Unpublished changes" on the template, and when A opens the editor again, the template has 6 tasks.
- AC-EDITOR-02: Given administrator A who added a sixth task to "Tenant move-in" and left the editor without saving, and manager B. When B opens the template from the list of templates. Then B sees version 1 with its 5 tasks, each marked "required" or "optional", and no notice about unpublished changes.
- AC-EDITOR-03: Given administrator A and "Tenant move-in" with unpublished changes (6 tasks) made from current version 1. When A saves the template. Then A sees the message "Version 2 saved" on the page of the template, version 2 with 6 tasks becomes the current version of the template, and the notice "Unpublished changes" disappears.
- AC-EDITOR-04: Given administrator A and a new template "Repair" with 1 section and 3 tasks, all 3 optional, that has never been saved as a version. When A saves it. Then A sees the message "A template needs at least one required task", no version is created, and the template keeps its 1 section, its 3 tasks and the notice "Unpublished changes".
- AC-EDITOR-05: Given the template "Tenant move-in" with version 1 (saved 05.10.2026 09:30 by administrator A) and version 2 (saved 12.10.2026 14:05 by administrator C), and administrator A. When A opens the list of versions of this template. Then A sees version 2 first with "12.10.2026 14:05" and the email of C, and version 1 second with "05.10.2026 09:30" and the email of A.
- AC-EDITOR-06: Given the template "Tenant move-in" with version 1 (5 tasks) and current version 2 (6 tasks), and a run launched by manager A from version 1. When A opens this run. Then A sees "Template version 1" and the 5 tasks of version 1.
- AC-EDITOR-07: Given manager B signed in and the template "Tenant move-in" with versions 1 and 2. When B opens the list of versions of this template by a direct link. Then B sees the message "Not enough rights" and no versions.
- AC-EDITOR-08: Given manager B signed in and the template "Tenant move-in" with current version 1 (5 tasks). When B tries to change this template or save a new version directly, bypassing the pages of the application. Then the template stays at version 1 with 5 tasks and has no unpublished changes.
- AC-EDITOR-09: Given a visitor who is not signed in. When the visitor opens the editor of the template "Tenant move-in" by a direct link. Then the visitor sees the sign-in page and no content of the template.
- AC-EDITOR-10: Given administrator A and the new template "Repair" that has never been saved as a version. When A opens the launch form. Then A sees "Repair" marked as unavailable with the note "Save the template to launch it" and cannot choose it for launching.
- AC-EDITOR-11: Given administrator A and the new template "Repair" that has never been saved as a version. When A tries to launch this template directly, bypassing the pages of the application. Then no run is created, and the list of runs does not change.
- AC-EDITOR-12: Given administrator A and the template "Tenant move-in" with current version 2 and no unpublished changes. When A tries to save the template, in the editor or directly, bypassing the pages of the application. Then no version 3 is created, and version 2 stays the current version.
- AC-EDITOR-13: Given administrator A in the editor of the template "Tenant move-in" with the section "Move-in day" that has 3 tasks. When A removes the section and cancels at the confirmation, which shows "Move-in day" and the notice "This cannot be undone". Then the section and its 3 tasks stay in the template.
- AC-EDITOR-14: Given administrator A in the editor of the template "Tenant move-in" with current version 1 (2 sections, 5 tasks). When A removes the section "Move-in day" (3 tasks) and confirms. Then the section and its 3 tasks are gone from the unpublished changes, and version 1 still has 2 sections and 5 tasks.
- AC-EDITOR-15: Given administrator A and the template "Tenant move-in" with current version 1, whose unpublished changes include a third section "After move-in" with no tasks. When A saves the template. Then A sees the message "Every section needs at least one task", no version 2 is created, and the template keeps its unpublished changes and the notice "Unpublished changes".
- AC-EDITOR-16: Given the new template "Repair" that has never been saved as a version, and manager B signed in. When B opens the page of "Repair" by a direct link. Then B sees the message "Template not found" and no sections or tasks.
- AC-EDITOR-17: Given manager B signed in and no template has been saved as a version. When B opens the list of templates. Then B sees the message "No templates yet. An administrator creates them." and no empty table.
- AC-EDITOR-18: Given administrator A and the new template "Repair" that has never been saved as a version. When A opens the list of versions of "Repair". Then A sees the message "No versions yet. Save the template to create version 1." and no empty table.
- AC-EDITOR-19: Given administrator A. When A creates a new template with the name empty or consisting only of spaces. Then no template is created, and A sees the message "Enter a template name".
- AC-EDITOR-20: Given administrator A and the template "Tenant move-in" with current version 1, whose unpublished changes include a task with the name cleared (empty or only spaces). When A saves the template. Then A sees the message "Every section and task needs a name", no version 2 is created, and the template keeps its unpublished changes and the notice "Unpublished changes".
- AC-EDITOR-21: Given administrator A and the template "Tenant move-in" with current version 1, and manager B. When A renames the template to "Tenant move-in (2026)" in the editor and saves it. Then version 2 is saved with the name "Tenant move-in (2026)", and B sees "Tenant move-in (2026)" in the list of templates.
- AC-EDITOR-22: Given manager B who launched a run from version 1 of "Tenant move-in", and version 2 saved with the name "Tenant move-in (2026)". When B opens the list of runs. Then the row of this run shows the template name "Tenant move-in", and a run launched from version 2 shows "Tenant move-in (2026)".
- AC-EDITOR-23: Given administrator A and the template "Tenant move-in". When A creates a new template with the name " tenant MOVE-IN " (different letter case, spaces at the start and the end). Then no template is created, and A sees the message "A template with this name already exists".
- AC-EDITOR-24: Given administrator A and the templates "Tenant move-in" and "Repair". When A renames "Repair" to "Tenant move-in" and saves it. Then A sees the message "A template with this name already exists", no new version of "Repair" is created, and the template keeps its unpublished changes and the notice "Unpublished changes".
- AC-EDITOR-25: Given administrator A in the editor of the template "Tenant move-in", and the connection is lost. When A adds a task "Sign handover act" and the change cannot be kept. Then A sees in the same place of the editor the message "Your last change was not kept. Try again." in the error colour, and the task stays on the screen.
- AC-EDITOR-26: Given a visitor who is not signed in and the template "Tenant move-in" with current version 1 (5 tasks). When the visitor tries to change this template or save a new version directly, bypassing the pages of the application. Then the request is refused and the visitor is directed to the sign-in page, nothing about the template is shown, and the template stays at version 1 with 5 tasks and has no unpublished changes.
- AC-EDITOR-27: Given the template "Tenant move-in" that existed before versions were introduced, and the run "Apartment 12, move-in" that manager A launched from it before versions existed. When A opens this run. Then A sees "Template version 1" and the tasks of the run as they were at launch.
- AC-EDITOR-28: Given administrator A in the editor of the template "Tenant move-in" with the sections "Before move-in" (2 tasks) and "Move-in day" (3 tasks). When A moves one task of "Move-in day" to "Before move-in" and saves the template. Then the new version has "Before move-in" with 3 tasks and "Move-in day" with 2 tasks.
- AC-EDITOR-29: Given manager B signed in and the template "Tenant move-in" with versions 1 and 2 (version 2 is current) and unpublished changes with 7 tasks. When B requests version 1, the list of versions or the unpublished changes directly, bypassing the pages of the application. Then the request is refused, B receives nothing except the current version 2, and the template stays as it was: version 2 current and the unpublished changes with 7 tasks kept.

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
- A new template that has never been saved as a version is shown to administrators with the notice "Unpublished changes". In the launch form administrators see it as unavailable, with the note "Save the template to launch it"; managers do not see it. Nobody can launch it.
- The version of a run is shown as "Template version N" on the page of the run.
- A run shows the template name of the version it was launched from, on the page of the run and in the list of runs.
- The name of a template belongs to its version: renaming a template is an unpublished change and takes effect with the next saved version; until then managers see the previous name.
- A template name is unique, ignoring letter case and spaces at the start and the end; the check is made when a template is created and when a renamed template is saved.
- A template, a section and a task need a name; a name consisting only of spaces counts as empty.
- While a template has no unpublished changes, saving is not offered in the editor.
- Removing a section or a task asks for confirmation with the notice "This cannot be undone"; a removed item can be returned only by adding it again.
- Tasks and sections can be reordered, and a task can be moved to another section.
- A manager opens a template from the list of templates on a page for reading only. The page shows the template name, "Version N", the sections with their tasks, the mark "required" or "optional" of each task and the link "Launch"; it shows only the current version.
- When there are no templates at all, an administrator sees the message "No templates yet. Create a template to start." and the link "Create a template", and no empty table.
- The editor always shows in one fixed place whether the changes are kept: "All changes kept", or the message from AC-EDITOR-25.
- Every template that exists when this slice starts becomes version 1, saved by the administrator who prepared it; runs launched before versions existed show "Template version 1".
- Every limit in the rights matrix of the Product is enforced for direct requests too: a request that a role is not allowed to make is refused, changes nothing and discloses nothing.
- The list of versions shows only the number, the date and time of saving and the email of the administrator who saved it. Dates and times are in Kyiv time, in the form DD.MM.YYYY HH:MM, to the minute.
- Section and task names are free text; limits on their length are not part of this slice.
- The interface is in English: messages and statuses are shown exactly as written in the acceptance criteria and in the glossary.
- The data is for training: object names and users are fictional (`*@example.test`).

### Відкриті питання

- Q1. Can an administrator discard the unpublished changes and return to the current version? (not in this slice: developers may offer it; tests do not check it.)

### Журнал змін

- 2026-10-25 — created
- 2026-10-27 — AC-EDITOR-10 and AC-EDITOR-11 added (a template that has never been saved as a version is unavailable in the launch form for administrators, hidden from managers, and cannot be launched, also directly); assumption about a new template extended — https://github.com/solomchaak/property-workflows-spec/issues/21
- 2026-10-27 — AC-EDITOR-12 added (saving a template without unpublished changes creates no version); assumption added that saving is not offered in that case — https://github.com/solomchaak/property-workflows-spec/issues/22
- 2026-10-27 — AC-EDITOR-13 and AC-EDITOR-14 added (removing a section or a task asks for confirmation); assumption added — https://github.com/solomchaak/property-workflows-spec/issues/23
- 2026-10-27 — AC-EDITOR-15 added (a template with a section that has no tasks cannot be saved as a version) — https://github.com/solomchaak/property-workflows-spec/issues/24
- 2026-10-27 — AC-EDITOR-02 reworded (a manager opens the template from the list of templates and sees each task marked "required" or "optional"); assumption added about the page of a template for a manager — https://github.com/solomchaak/property-workflows-spec/issues/25
- 2026-10-27 — AC-EDITOR-16 added (a manager opening a template that has never been saved as a version by a direct link sees "Template not found") — https://github.com/solomchaak/property-workflows-spec/issues/26
- 2026-10-27 — AC-EDITOR-17 and AC-EDITOR-18 added (empty list of templates for a manager, empty list of versions); assumption added about the empty list of templates for an administrator — https://github.com/solomchaak/property-workflows-spec/issues/27
- 2026-10-27 — AC-EDITOR-19 and AC-EDITOR-20 added (a template, a section and a task need a name; spaces only count as empty) — https://github.com/solomchaak/property-workflows-spec/issues/28
- 2026-10-27 — AC-EDITOR-21 and AC-EDITOR-22 added (the name of a template belongs to its version; a run keeps the name of the version it was launched from); assumptions added — https://github.com/solomchaak/property-workflows-spec/issues/29
- 2026-10-27 — AC-EDITOR-23 and AC-EDITOR-24 added (a template name is unique, ignoring letter case and spaces at the start and the end; checked when a template is created and when a renamed template is saved) — https://github.com/solomchaak/property-workflows-spec/issues/30
- 2026-10-27 — AC-EDITOR-25 added (the editor shows when a change could not be kept); assumption added about the fixed place with the state of the changes — https://github.com/solomchaak/property-workflows-spec/issues/31
- 2026-10-27 — AC-EDITOR-26 added (a visitor who is not signed in cannot change a template directly and is directed to the sign-in page) — https://github.com/solomchaak/property-workflows-spec/issues/32
- 2026-10-27 — AC-EDITOR-27 added (a run launched before versions existed shows "Template version 1"); assumption added that existing templates become version 1 — https://github.com/solomchaak/property-workflows-spec/issues/33
- 2026-10-27 — AC-EDITOR-28 added (the administrator can move a task to another section) — https://github.com/solomchaak/property-workflows-spec/issues/36
- 2026-10-27 — AC-EDITOR-29 added (a manager cannot get older versions, the list of versions or unpublished changes by a direct request); assumption added that every limit of the rights matrix is enforced for direct requests — https://github.com/solomchaak/property-workflows-spec/issues/37
- 2026-10-27 — AC-EDITOR-03 reworded (after saving, the message "Version N saved" is shown) — https://github.com/solomchaak/property-workflows-spec/issues/38
