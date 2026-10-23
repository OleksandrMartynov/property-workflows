You are a senior product designer-engineer building the FORM CONTROLS of the "Property Workflows" design system (style B, leading 2026 quality). Folder: `D:/tmp/ws7-lab/ds/` served at http://127.0.0.1:4173/. Do not touch any git repo.

FIRST read fully: `BRIEF.md`, `tokens.css`, `base.css`, and skim `index.html` (Foundations) to match its craft. Follow BRIEF.md strictly (page skeleton, tokens only — never literal colors, `pw-*` naming, states, ARIA per WAI-ARIA APG, motion choreography: refined and alive, never stiff; reduced motion; glass only on floating layers; synthetic data; English UI copy).

DO NOT edit tokens.css, base.css or index.html (other designers depend on them). Put your component CSS in `forms.css` and JS in `forms.js`; if you need a new token, define it locally in forms.css under a clearly marked "proposed tokens" block and list it in your report.

Build `forms.html` — a gallery page ("Form controls") in the same visual language as index.html, with a theme toggle, showing every control in all states (default, hover, focus-visible, active, disabled, invalid with message, loading where relevant) in light and dark, fully interactive with mouse and keyboard. NO native browser look anywhere. Controls:
1. Text input (with label, hint, counter "21/100", leading icon, clear button, error), textarea with autosize.
2. Password input with reveal toggle and caps-lock hint.
3. Select (listbox) and Combobox with search/filter, highlighted matches, empty result, option descriptions, avatars (assignee picker: manager.a@example.test, manager.b@example.test, admin@example.test with role tags), keyboard (↑↓ Home End Enter Esc typeahead).
4. Multi-select with chips (tags), removable, overflow "+3".
5. Date picker (calendar grid as ARIA grid, month nav with smooth transition, today marker, disabled past dates option), time picker (list or segmented hours/minutes), date-range picker, all in "Kyiv time" with label; due-date quick presets (Today, Tomorrow, Next week).
6. Number / currency input (€, tabular-nums, stepper with press-and-hold acceleration, min/max, formatting "€1,250.00").
7. Checkbox (incl. indeterminate) with drawn check animation; radio group; switch with spring thumb; segmented control (e.g. view switcher "List · Schema · Canvas") with sliding indicator; slider (single + range) with value bubble.
8. File drop zone (drag-over state, file list with progress, error "PDF up to 20 MB").
9. Form field layout patterns: label above, inline validation timing (on blur, then live), required marker, field groups, a compact "Launch a template" form example (Case name, per-task Assignee pickers for tasks "Sign the lease agreement", "Inspect the apartment", "Order cleaning", "Hand over the keys", "Record meter readings", primary "Launch" button with loading state).
Motion: popovers grow from trigger origin with glass; options highlight smoothly; checkbox draw; switch spring; segmented indicator slides; calendar month cross-slide; validation message eases in (no layout jump: reserve space or animate height smoothly).

Verify with the screenshot tool: `node "D:/tmp/ws7-lab/shoot.mjs" forms.html <light|dark> <outname> 1440 900 <scrollY|#selector> "<optional js to run before shot, e.g. open a popover>"` → PNG in D:/tmp/ds-shots/ (Read it to view). It also prints console errors. Iterate until it looks world-class in BOTH themes (check spacing rhythm, alignment, optical balance, focus rings, contrast). Also check 390px width once. Report in Ukrainian: what you built, design decisions, proposed tokens, known gaps.