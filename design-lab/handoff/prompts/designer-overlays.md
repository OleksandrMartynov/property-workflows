You are a senior product designer-engineer building OVERLAYS & FEEDBACK of the "Property Workflows" design system (style B, leading 2026 quality). Folder: `D:/tmp/ws7-lab/ds/` served at http://127.0.0.1:4173/. Do not touch any git repo.

FIRST read fully: `BRIEF.md`, `tokens.css`, `base.css`, and skim `index.html` (Foundations) to match its craft. Follow BRIEF.md strictly (page skeleton, tokens only, `pw-*` naming, states, ARIA per WAI-ARIA APG, motion: refined and alive — never stiff, reduced motion, glass only on floating layers with opaque fallback under prefers-reduced-transparency/forced-colors; synthetic data; English UI copy).

DO NOT edit tokens.css, base.css or index.html. Put CSS in `overlays.css`, JS in `overlays.js`; proposed new tokens go in a marked block in overlays.css and in your report.

Build `overlays.html` — gallery page ("Overlays & feedback") in the same visual language as index.html, with theme toggle; everything interactive (mouse + keyboard) and shown in light and dark:
1. Button system (needed by overlays): primary, secondary, outline, ghost, destructive, link; sizes 28/32/36; icon-only; loading (spinner morph, width stable); press scale; kbd hint inside button.
2. Dialog: the product's confirmation for the last required task — title = task name "Hand over the keys", body "This cannot be undone", buttons "Cancel" / "Mark as done" (primary, not destructive red unless justified), focus trap, Esc, return focus to trigger, backdrop soft blur, panel springs in from slight scale/rise; also an alert dialog for destructive delete with type-to-confirm.
3. Popover (with arrow optional), tooltip (delay-in, instant between siblings, kbd shortcut inside), dropdown menu with sections, icons, shortcuts, submenu, checkable items, destructive item ("Delete"), all growing from trigger origin.
4. Command palette ⌘K (Raycast-level): search input, grouped results (Runs, Templates, Actions), highlighted matches, keyboard hints on rows, action panel for the selected item (second ⌘K), recent items, empty state, loading shimmer; glass panel. Use synthetic data: runs "Apartment 12, move-in", "House 3, inspection", templates "Tenant move-in", "Apartment repair", actions "Mark as done", "Assign…", "Insert variable…", "Launch template…".
5. Toasts: success/info/error/undo ("Task marked as done · Undo" with 5s progress), stacked (max 3) with spring reflow, hover pauses, swipe/close, bottom-right.
6. Inline alerts / banners (info, warning, error, success) incl. form error "Invalid email or password." and the "Run not found" message block.
7. Skeletons & loading: shimmer sweep for list rows, run page, cards; progress bar indeterminate; spinner; optimistic update example (checkbox toggles instantly, fails → reverts with toast).
8. Empty states: "No runs yet" with one action "Launch a template", "No templates yet", search no results, permission denied ("Only an administrator can change templates") — calm, illustrative (simple line illustration in SVG using tokens, no stock), one sentence + one action.
9. Sheet/side panel (right drawer) for task details on narrow widths.
Motion choreography per BRIEF (origin-aware scale, exit 0.7×, stagger for menu items lightly, toast stack spring).

Verify with: `node "D:/tmp/ws7-lab/shoot.mjs" overlays.html <light|dark> <outname> 1440 900 <scrollY|#selector> "<js to open a dialog/menu/palette before the shot>"` → PNG in D:/tmp/ds-shots/ (Read to view; prints console errors). Iterate until world-class in BOTH themes, check 390px once. Report in Ukrainian: built items, decisions, proposed tokens, gaps.