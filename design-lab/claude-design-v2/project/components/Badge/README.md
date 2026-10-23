# Badge

Дрібна мітка: Badge — нейтральна (роль, «required», AI, змінна), StatusBadge — статус домену, завжди з іконкою й словом. Джерело — `badge.tsx`, `status-badge.tsx`.

## Badge

Висота 20px, радіус `radius-xs`, паддинг 6px, текст `meta` (12/16) вагою 500.

| `variant` | Коли | Токени |
| --- | --- | --- |
| `neutral` | Нейтральна мітка: «required» | `secondary` / `secondary-foreground` |
| `outline` | Роль користувача в сайдбарі: «manager» | межа `border`, текст `muted-foreground` |
| `primary` | Тип сутності, не статус: «Template» | `status-progress` / `status-progress-foreground` |
| `ai` | Лише AI-чернетка: «AI draft» | `ai` / `ai-foreground` |
| `variable` | Лише змінна запуску: `{{tenant_name}}` | `variable` / `variable-foreground` |

## StatusBadge

Пігулка (`radius-pill`) висотою 20px: іконка 14px, слово, тінт. Тон і форма іконки різні для кожного статусу, тож статус не тримається на кольорі.

| `status` | Іконка | Слово (приклад) | Токени |
| --- | --- | --- | --- |
| `todo` | пунктирне кільце | to do | `status-todo`, `-foreground`, `-mark` |
| `progress` | кільце з половиною заливки | in progress | `status-progress…` |
| `done` | галочка в колі | done, completed | `status-done…` |
| `overdue` | знак оклику в колі | overdue | `status-overdue…` |
| `due-soon` | годинник | due soon | `status-due-soon…` |

Фон — `status-X`, текст — `status-X-foreground` (≥ 4.5:1), іконка — `status-X-mark` (≥ 3:1). Статус запуску «completed» — це `done`.

## Що дає споживач

`children` — слово статусу зі словника продукту, малими літерами: «to do», «in progress», «completed»; `status`. Для `Badge` — `variant`.

## Do / Don't

- Do: слово поруч з іконкою завжди; числа й дати — з `tabular-nums`.
- Don't: `ai`, `variable`, `status-*` як декор; суцільна статусна заливка з текстом; статус лише кольором.
