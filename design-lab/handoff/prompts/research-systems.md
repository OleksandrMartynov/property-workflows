You are a principal product designer benchmarking leading design systems (as of late 2026) to raise our own design system to "leading 2026" level. Do real web research (WebSearch/WebFetch on official docs, token files on GitHub, changelogs, design-engineering blog posts) — cite sources; do not invent numbers. Write the report in Ukrainian (UI terms in English).

## Our product
"Property Workflows": a more powerful Process Street replacement for property managers — templates → runs (checklists with required tasks), per-run custom variables, template & form builder (List · Schema · Canvas like n8n), conditional logic, invoice generation from task prices, AI document parsing with provenance & 3-level confidence. Desktop-first, compact Linear density, Linear-style sidebar + ⌘K, 3-zone run page, dark theme via system preference, calm-but-fluid spring motion, no default browser controls, best-in-class login page.

## Our current foundation (read first, do NOT edit)
Folder: `D:/tmp/ws7-lab/ds/` — `tokens.css` (OKLCH tokens, shadcn names + status/ai/variable/required/surface/motion), `base.css` (type classes, motion primitives), `index.html` (foundations page), `BRIEF.md` (rules). Other designers are concurrently writing forms.*, overlays.*, domain.*, logo* — don't touch those either.

## Benchmark these systems (pick the concrete, checkable facts)
Linear (incl. its 2024–2026 redesign write-ups, LCH theme generator, density, sidebar, ⌘K, motion), Vercel Geist (colors scale, type, materials), Stripe (Dashboard + Sail/Apps UI, tables, money formatting, invoice UI), Atlassian Design System (tokens naming, elevation, motion tokens, density), GitHub Primer (functional color tokens, a11y), IBM Carbon (motion: productive vs expressive, type scale, data tables), Shopify Polaris (2025–2026 incl. web components), Material 3 Expressive (motion physics/springs, shape morphing), Microsoft Fluent 2, Apple HIG (Liquid Glass materials — what transfers to web and what doesn't), Radix Colors / Radix Themes (12-step scales, alpha colors), Attio, Raycast, Notion, Plain/Height (dense B2B), plus 2–3 process/workflow tools (n8n canvas UI, Process Street, Tallyfy/Pipefy) for domain patterns.

## For each system extract (where public)
Colour architecture (scales, semantic layers, alpha/overlay colours, dark-mode approach, status colours), type scale & line-heights for dense UI, spacing/density modes, radii, elevation/materials, focus ring, motion tokens (durations, easings/springs, choreography rules), data-display patterns (tables, numbers, dates), empty/error/loading state rules, iconography, accessibility rules, token naming conventions, documentation structure (how they write rules an agent can follow).

## Deliverables (in the ds/ folder)
- `systems.html` — standalone page linking `tokens.css` + `base.css` (colours only via our token variables, no raw hex). Sections:
  1. Executive summary: the 10 most valuable practices to adopt, each with "why", source, and the concrete change for us.
  2. Comparison matrix: systems × dimensions (colour, type, density, motion, elevation, a11y, tokens naming, docs) with compact notes.
  3. **Gap analysis against our tokens.css/base.css/BRIEF.md**: a precise, numbered change list (e.g. "add alpha scale `--primary-a3..a6` for hover/selection, values …", "type: 13/20 body-sm for tables", "motion: split productive/expressive", "elevation: 3 levels with dark-mode border-highlight instead of shadow"), each tagged must/should/could, with proposed OKLCH values or numbers. Check that proposed colours keep WCAG (text ≥ 4.5, UI ≥ 3) in both themes — compute contrast from OKLCH with a small Node script (no Python available; Node 24 is).
  4. Domain patterns worth stealing: runs/checklists, builders (list vs canvas), variables, invoices, AI provenance, ⌘K, login pages of top SaaS (Linear, Vercel, Stripe, Attio, Raycast, Clerk, WorkOS) — what makes a login page best-in-class in 2026 and what ours must have.
  5. Anti-patterns to avoid (things that look "2023 template", AI-slop gradients, generic shadcn look) — concrete.
  6. DESIGN.md structure recommendation: how leading systems document rules so an AI agent can follow them; propose the section outline for our DESIGN.md (course template has: overview, colours+contrast, typography, spacing/radii, components+variants, states, a11y, do/don't, how to add a token, checks).
  Polished, scannable, works in light/dark (tokens handle it), 1440 px and 400 px.
- `SYSTEMS.md` — 1-page Ukrainian summary + the must/should change list.
- Verify visually: the local server is already running at http://127.0.0.1:4173 (serves ds/). Screenshot with `node "D:/tmp/ws7-lab/shoot.mjs" systems.html light sys-light` and `... dark sys-dark` (args: path theme outname [W] [H] [scrollY|#selector]; PNGs in D:/tmp/ds-shots/), Read them, fix issues. Don't start another server.

Don't touch the repo D:\Agentic Course\property-workflows. Report back: the must-change list (≤12 items), top 5 insights with sources, and anything in our foundation that is clearly below the 2026 bar.