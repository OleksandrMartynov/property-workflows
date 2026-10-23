# archive/design-lab

Матеріали дизайну WS7 (завдання B) property-workflows, які не входять у `main` (там лише код дизайн-системи): лабораторія
дизайну, джерела артефакта Claude Design, допоміжні скрипти, нотатки передачі. Код і документи дизайн-системи — у PR
`task/design-system` (`DESIGN.md`, `src/components/ui/`, `scripts/`).

| Тека | Що це |
|---|---|
| `design-lab/ds/` | сторінки лабораторії: `index.html` (основа), `forms.html`, `overlays.html`, `domain.html`, `logo.html`, `libraries.html`, `systems.html`, `fonts.html`; `tokens.css`, `base.css`, `BRIEF.md` (правила для дизайнерів) |
| `design-lab/claude-design-v2/` | джерела артефакта Claude Design: `previews-src/` → `build-previews.mjs`, `build-tokens.mjs` (токени з `src/app/globals.css`), `build-index.mjs`, `check.mjs`, `project/` (README, tokens.json, motion, screens, превʼю компонентів, логотипи) |
| `design-lab/tools/` | `serve-ds.mjs` (локальний сервер лабораторії), `shoot.mjs` і `shoot-app.mjs` (знімки headless Chrome), `patch-cursor.mjs`, `audit.js` (аудит сторінки для циклу візуальної перевірки), `oklch.mjs`, `run-with-env.mjs` |
| `design-lab/handoff/` | `HANDOFF*.md` (стан і рішення) і промпти дизайнерів |

## Як відкрити на іншому ПК

```bash
git fetch origin archive/design-lab
git worktree add ../design-lab-archive archive/design-lab
cd ../design-lab-archive/design-lab
node tools/serve-ds.mjs   # http://127.0.0.1:4173 (шляхи в скриптах під Windows: змініть D:/… на свої)
```

Скрипти писались під Windows із шляхами `D:/tmp/…`; перед запуском замініть їх (`grep -rn "D:/" tools`). Claude Design
опублікований як артефакт `claude.ai/artifact/BamW4LNTPFw37TFKkzJU9Z`; його файли можна перевидати з
`claude-design-v2/` (`node build-tokens.mjs && node build-previews.mjs && node build-index.mjs && node check.mjs`).
Скрипти збірки читають `src/app/globals.css` із репо за відносним шляхом, тож розташуйте `claude-design-v2/` у
`_design/` кореня клону `property-workflows`.

Дані лише синтетичні; секретів у гілці немає.
