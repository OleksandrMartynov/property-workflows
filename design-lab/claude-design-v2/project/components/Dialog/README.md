# Dialog

Модальне вікно на нативному `<dialog>`; ConfirmDialog — готове підтвердження дії без відкату (alertdialog). Джерело — `dialog.tsx` і клас `.ui-dialog` у `globals.css`.

## Dialog

- Нативний `showModal()`: фокус-пастка, `Esc` і неактивний фон дає браузер. Закриття — `onClose`.
- Вікно: ширина до 448px (`max-w-md`), `radius-xl`, тло `popover`, межа `border`, тінь `elevation-3`. Підкладка — `overlay` із розмиттям 4px.
- Рух: вхід — прозорість за `duration-moderate` і підйом 6px з масштабом 0.98 на `spring-smooth`; вихід — ×0.7 (`exit-factor`) на `ease-exit`. При reduced motion зсув і масштаб зникають, лишається fade.
- `role="dialog"` закривається кліком повз вікно; `role="alertdialog"` — ні: відповідь лише кнопкою.
- `labelledBy` і `describedBy` — id заголовка й опису (для ConfirmDialog ставляться самі).

## ConfirmDialog

Складається з тіла (заголовок `title` 20/28, опис `body` у `muted-foreground`) і футера з тлом `muted` 40% та верхньою межею. У футері: `Cancel` (`outline`) і `OK` (`default`); початковий фокус — на `OK` (компонент переносить його після `showModal()`).

- `title` — що саме робимо: «Hand over the keys».
- `description` — наслідок: «This cannot be undone.»
- `confirmLabel` (за замовчуванням «OK») можна замінити дієсловом дії; `cancelLabel` — «Cancel».

Початковий фокус — на кнопці підтвердження («OK»): так записано в DESIGN.md (правило 4). `showModal()` фокусує першу кнопку («Cancel»), тому компонент сам переносить фокус на підтвердження після відкриття. Esc і «Cancel» закривають без дії.

## Do / Don't

- Do: confirm лише перед тим, що не можна відкотити (остання обов'язкова задача, видалення).
- Don't: `window.confirm`; діалог для повідомлення про результат (для цього `Alert`); діалог у діалозі; скляний фон на діалозі (скло — лише для поповерів, меню й палітри).
