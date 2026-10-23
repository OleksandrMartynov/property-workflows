# Button

Кнопка дії: шість варіантів, чотири розміри, одна основна дія на екран. Джерело — `src/components/ui/button.tsx`.

## Варіанти

| `variant` | Коли | Токени |
| --- | --- | --- |
| `default` | Основна дія екрана: «Mark as done», «Launch run», «OK». Не більше однієї на вигляд | `primary` / `primary-foreground`, тінь `elevation-1`; hover `primary-hover`, active `primary-active` |
| `secondary` | Вторинна дія поруч з основною, коли межа зайва: «Save draft» | `secondary` / `secondary-foreground`; hover `accent`; pressed `state-pressed` |
| `outline` | Скасування й рівнозначні дії у футері: «Cancel», «Details»; «Sign out» у сайдбарі (з іконкою LogOut, на всю ширину, текст `foreground`) | межа `border`, тло `card`; hover `state-hover` |
| `ghost` | Тиха дія в щільному місці: «Skip». Важливі дії (зокрема «Sign out») — не `ghost` | без заливки; hover `state-hover` |
| `destructive` | Незворотна дія — лише через `ConfirmDialog` | `destructive` / `destructive-foreground`; hover `destructive-hover` |
| `link` | Дія-посилання всередині тексту: «View runs» | `primary`, підкреслення 35% → 100% на hover; без висоти й паддингу |

## Розміри

- `sm` — 28px (`size-control-sm`), горизонтальний паддинг 10px.
- `md` — 32px (`size-control`), паддинг 12px. За замовчуванням.
- `lg` — 36px (`size-control-lg`), паддинг 16px, текст 14px. Форма входу й порожні стани.
- `icon` — квадрат 32×32. Завжди з `aria-label`.

Текст кнопки — `label` (13/18, вага 500). Радіус — `radius-sm`. Проміжок іконка ↔ текст — 6px (`space-1-5`).

## Стани

- hover — тінт або `primary-hover`; розмітка не зсувається.
- active — `scale(0.97)` на `spring-snappy` (`--scale-press`) і темніша заливка (`primary-active` / `state-pressed`).
- clicked — пульс-кільце `[data-clicked]` 520ms токеном `ring` (від 60% до 0% прозорості, до 7px); ставить `InteractionFeedback`. Reduced motion: статичний `outline` 2px `ring`.
- focus-visible — outline `ring-width` суцільним `ring`, відступ `ring-offset`; ніколи не «світіння».
- disabled — `opacity: 0.5`, курсор `not-allowed`.
- loading — `loading` вимикає кнопку, ставить `aria-busy` і показує спінер 14px перед текстом: «Signing in…», «Saving…», «Launching…» (спінер + слово дії).

## Що дає споживач

- `children` — дієслово + об'єкт, sentence case, без крапки: «Mark as done», «Launch run».
- `variant`, `size`, `loading`, `disabled`, `onClick`; `type` за замовчуванням `button` (для форми — `submit`).
- Для навігації — класи `buttonVariants({ variant, size })` на `<Link>`, не `<a>` у `<button>`.

## Do / Don't

- Do: одна `default` на екран; `destructive` тільки з підтвердженням; `aria-label` на `icon`.
- Don't: дві `default` поруч; власні кольори кнопки; `window.confirm` замість ConfirmDialog; вимкнена кнопка без пояснення, чому.
