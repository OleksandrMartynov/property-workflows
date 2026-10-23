# Input

Поле вводу й супутні компоненти форми: Input, Textarea, SearchInput, PasswordInput, Label і Field (підпис, підказка, помилка, лічильник). Вибір зі списку, дати, числа й файли — в окремих компонентах (Select, DateTime, Choice, FileDrop). Джерело — `input.tsx`, `password-input.tsx`, `search-input.tsx`, `label.tsx`, `field.tsx`.

## Токени й вигляд

- Межа — `input` (≥ 3:1 до `background` і `card` в обох темах), заливка — `field`, текст — `foreground`, placeholder — `muted-foreground`, каретка — `primary`.
- Висота: `md` 32px (`size-control`), `lg` 44px, `xl` 48px (заголовковий розмір); `lg` — поля форми входу. Паддинг 12px, радіус `radius-sm`, текст `body` 14/20.
- hover — межа `border-hover` (на крок темніша за `input`); focus-visible — межа `ring` і outline `ring-width` усередину (`-1px`); invalid — межа й outline `destructive`; disabled — заливка `muted`, межа `border`; лише читання — легка заливка `muted` 50%.
- Правий край резервує місце під значки наперед (помилка, «очистити», власний `trailing`), тому текст не стрибає; значки з'являються з легким підскоком (`spring-bouncy`).
- Системного вигляду немає: нативного `<select>`, стрілок number, «хвостика» зміни розміру в textarea, кнопки очищення пошуку браузера.

## Field

`Field` складає підпис + поле + повідомлення + лічильник; `id` обов'язковий і зв'язує `Label htmlFor`, `${id}-hint` і `${id}-error`.

- `label` — текст підпису (`label` 13/18, вага 500); placeholder підпис не замінює. `required` додає червону зірочку (лише візуально, `aria-hidden`; `aria-required` — на полі), `optional` — «Optional» (`meta`, `muted-foreground`) праворуч у рядку підпису.
- `error` — `meta` у `destructive` зі значком оклику 14px і `role="alert"`; текст дослівно з AC («Enter your email and password.», «Enter a valid email.»). Помилка й підказка ділять одну клітинку: текст перетікає без стрибка макета, а поле без підказки розкриває рядок помилки пружиною.
- `hint` — лише там, де це реальна інформація формату чи валідації; пояснень «про всяк випадок» немає (правило мінімуму тексту).
- `counter` — «21/100» праворуч під полем (`tabular`): `muted-foreground`, від 90% ліміту `status-due-soon-foreground`, понад ліміт `destructive`; сам ліміт не накладає.
- Саме поле отримує `id`, `aria-describedby`, `aria-invalid`, `aria-required` з контексту.

## Input, SearchInput, PasswordInput

- `leading` — іконка зліва (лише декор), `trailing` — елемент справа. `clearable` — кнопка «×» 24px (`aria-label="Clear"`), що з'являється, коли в полі є текст, і повертає фокус у поле.
- SearchInput: лупа ліворуч, «Clear search», Esc очищає, `type="search"` без вбудованої кнопки браузера.
- PasswordInput: кнопка-око 24px («Show password» / «Hide password», `aria-pressed`), риска домальовується; вставку не блокуємо (WCAG 3.3.8), `autoComplete="current-password"`; фокус і виділення при перемиканні не губляться. `capsIndicator` додає значок Caps Lock у полі, а текст «Caps Lock is on.» (`status-due-soon-foreground`, `aria-live="polite"`) стоїть під полем.

## Textarea

Без «хвостика» зміни розміру: починається з `rows` (2) і росте разом із текстом до `maxRows` (6) рядків, далі прокручується; вертикальний паддинг 8px. Під `Field` дає лічильник символів.

## Do / Don't

- Do: підпис завжди видно; помилка під полем; `type="email"` і `autoComplete` на полях входу; ліміт — лічильником.
- Don't: placeholder замість підпису; підказка лише в tooltip; червоний без тексту помилки; блокування вставки в паролі; нативний `<select>`.
