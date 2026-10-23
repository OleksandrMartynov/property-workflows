# Прогрес: дослідження бібліотек компонентів (libraries)

Станом на 23.10.2026 (ФІНАЛ — все готово).

**Вердикт:** гібрид «React Aria-first»: react-aria-components 1.22.1 + @internationalized/date (форми, оверлеї, date/time/range у Europe/Kyiv, NumberField з валютою, DnD/Tree/Table, ⌘K через Autocomplete, Sheet), Base UI 1.9.0 лише для Toast (запасний Sonner). Доставка — shadcn CLI 4.21 `--base aria` + власні файли в `src/components/ui`. Canvas — @xyflow/react 12.12, rich text — Tiptap 3.31 (+ TokenField alpha для коротких полів), таблиці — TanStack Table 9, графіки — Recharts 3.10, іконки — Lucide.
Альтернативи: B — «Base UI + shadcn base-nova» (дефолт курсу) з RAC-островами; C — «тільки React Aria».

**Зроблено:**
- `D:/tmp/ws7-lab/ds/libraries.html` згенеровано (скрипти `D:/tmp/ws7-lab/research/gen.mjs` + `gen-data.mjs`): вердикт, 3 стеки, 5 несподіваних знахідок, матриця оцінок (15 кандидатів), таблиця «хто виграє» (≈40 контролів), спеціалізовані частини, шлях у src/components/ui + @custom-variant, виміряні бандли (esbuild), ризики, пакети, питання.
- Світла/темна теми й 1440 px перевірено скріншотами; 400 px — знімки зроблено, потрібно переглянути.

**Залишилось:**
1. (зроблено) мобільні знімки перевірено, переповнення матриці виправлено.
2. (зроблено) `LIBRARIES.md` написано.
3. (зроблено) лишається лише фінальний звіт координатору.

**Як перегенерувати:** `node D:/tmp/ws7-lab/research/gen.mjs` (пише `ds/libraries.html`); знімки — `node D:/tmp/ws7-lab/shoot.mjs libraries.html light|dark <out> [W] [H] [y|#sel]`.
