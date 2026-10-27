> Джерело: https://github.com/solomchaak/property-workflows-spec/issues/19 · оновлено 2026-10-27T10:09:14Z

# Requirement: Use one design system across the application

### Навіщо

Screens built one at a time look and behave differently: statuses, messages and empty pages are different on every screen, so a manager has to relearn each one. After this requirement every page of the application looks and behaves the same, in the tone and colours described in the section "Вигляд і тон" of the Product, and every page tells the user what happened (a status, an empty list, a denied action) in the same way.

### Користувачі й ролі

- Manager (`manager`) and administrator (`admin`) — use the same pages, statuses and messages; what differs between them is only what they are allowed to see and do (see the rights matrix in the Product).
- A visitor who is not signed in sees the sign-in page, which looks like the rest of the application.

### Основний сценарій

1. A user signs in and moves between the pages of the application: the list of templates, the editor, the list of runs, the page of a run and the launch form.
2. Statuses, messages, forms and lists look and read the same on every page.
3. When something is missing or not allowed (no runs yet, no rights, not signed in), the user sees a clear message in the same place and the same style on every page.
4. A user chooses how the application looks: follow the device, always light or always dark.

### Критерії приймання

- AC-DSYS-01: Given manager A with one run "in progress" (2 of 5 done) and one run "completed" (5 of 5 done). When A opens the list of runs and then the page of each run. Then the list and the pages show the status with the same words "in progress" and "completed" and the same colour for the same status ("in progress" blue, "completed" green, as in "Вигляд і тон" of the Product), and the status word is always written next to its colour.
- AC-DSYS-02: Given manager B signed in and the template "Tenant move-in" with current version 1. When B opens the editor of this template by a direct link. Then B sees the message "Not enough rights" and the link "Back to templates" in the same page layout as the other pages, no content of the editor, and the template stays at version 1 with no unpublished changes.
- AC-DSYS-03: Given a visitor who is not signed in. When the visitor opens the page of a run by a direct link. Then the visitor sees the sign-in page in the same page layout as the other pages, and no data of the run is shown.
- AC-DSYS-04: Given manager B who has no runs. When B opens the list of runs. Then B sees the message "No runs yet. Launch a template to start one." and the link "Launch a template", and no empty table.
- AC-DSYS-05: Given user A signed in whose device is set to a dark appearance, and A has not chosen a theme. When A opens any page of the application. Then the page is shown in the dark theme, and the choice "Theme" shows "System".
- AC-DSYS-06: Given user A signed in who chose "Light" while the device is set to a dark appearance. When A opens the list of runs, closes the browser and opens the list of runs again on the same device. Then the page is shown in the light theme both times, and the choice "Theme" shows "Light".
- AC-DSYS-07: Given manager A with one run "in progress" and one run "completed", and the dark theme in use. When A opens the list of runs. Then the status words "in progress" and "completed" are shown in blue and green, as in the light theme, with the status word next to the colour and a contrast of at least 4.5 to 1 between the status text and its background.
- AC-DSYS-08: Given a visitor who is not signed in, and manager B who is the run manager of the run "Apartment 12, move-in". When the visitor opens the page of this run by a direct link, sees the sign-in page and signs in as B. Then B sees the page of the run "Apartment 12, move-in".

### Поза межами

- Other interface languages and a custom look for a specific client.
- Pages that do not exist yet; later slices follow the same design system, but their pages are specified in their own requirements.
- Animations and illustrations.
- Which design system to use and how to build it: the developer decides.

### Припущення

- Users with the roles `manager` and `admin` are created by the administrator, who chooses the role at the moment of creation; in the training project they are prepared as initial data. A user without a role does not exist.
- The pages covered are all pages of slices 1 and 2: sign-in, the list of templates, the editor, the list of versions, the launch form, the list of runs and the page of a run.
- The tone, the colours by meaning, the density and the style of texts are those of the section "Вигляд і тон" of the Product; a message written in an acceptance criterion is shown word for word.
- The interface is in English.
- The choice of theme is "System", "Light" or "Dark"; the default is "System", which follows the device.
- The choice of theme is stored on the device, not in the user's profile, and the theme applies to all pages, including the sign-in page.
- After signing in from a direct link the user lands on the page the link led to; if the role does not allow it, the same refusal as for a signed-in user applies (AC-TASK-10, AC-DSYS-02).
- All dates and times in the application are shown in Kyiv time.
- The data is for training: object names and users are fictional (`*@example.test`).

### Відкриті питання

Немає.

### Журнал змін

- 2026-10-25 — created
- 2026-10-27 — AC-DSYS-05, AC-DSYS-06 and AC-DSYS-07 added (choice of theme: System, Light or Dark; default System; remembered on the device; statuses keep their words and colours by meaning with a contrast of at least 4.5 to 1); "Dark theme" removed from "Поза межами" — https://github.com/solomchaak/property-workflows-spec/issues/34
- 2026-10-27 — AC-DSYS-08 added (after signing in from a direct link the user lands on the page the link led to) — https://github.com/solomchaak/property-workflows-spec/issues/35
