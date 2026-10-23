# DateTime

Дата, діапазон дат, час, число й сума: DatePicker, DateRangePicker, TimeField, NumberField, CurrencyField. Усі дати й час у продукті — за Києвом: позначка «Kyiv time GMT+3» стоїть у рядку підпису поля. Джерело — `date-picker.tsx`, `time-field.tsx`, `number-field.tsx`, `dt-shared.tsx`, `date-time.css`.

## DatePicker

Поле, що пишеться текстом («24 Oct», «tomorrow», ISO) або вибирається в календарі; у форму йде ISO `YYYY-MM-DD` через прихований input. Кнопка-календар 24px (`size-hit`) у полі, `aria-haspopup="dialog"`, `aria-expanded`. Швидкі дати `presets` — пілюлі «Today · Tomorrow · Next week» із датою; вибрана має `aria-pressed` і заливку `primary-tint`. Хибний ввід («format», «range») фарбує поле й дає значок; текст помилки — у `Field`. Позначка «Kyiv time» — праворуч від підпису (`showTimezone`).

## Календар (поповер)

ARIA grid у `.surface-float`, ширина `size-popover-cal` (17rem), клітинка `size-day` (2rem), тиждень починається з понеділка, шість рядків.

- Сьогодні — крапка `primary` під числом; вибраний день — заливка `primary` і `primary-foreground`; дні поза місяцем — `muted-foreground`; вимкнені — `control-disabled-fill` і перекреслені.
- Діапазон: смуга `primary-tint` на половину клітинки біля країв і суцільна посередині; поки вибирають кінець — попередній перегляд `primary` 7% і контур `primary` на дні під курсором.
- Перегортання місяця: стара панель виходить, нова входить зі зсувом `distance-slide` (24px) у бік перегортання; кнопки «Previous month» / «Next month» 28px.
- Підвал: позначка «Kyiv time» і ghost-кнопка «Today».
- Клавіатура: стрілки ±1 день / ±7, Home / End — початок і кінець тижня, PgUp / PgDn — місяць (⇧ — рік), Enter / Пропуск вибирають, Esc закриває й повертає фокус на кнопку; Tab крутиться всередині поповера. Живий регіон озвучує вибір.

## DateRangePicker

Два поля в одній оболонці (`dt-shell`) зі стрілкою між ними й одним календарем із двома місяцями; помилка «End date must be after the start date.» Обидві дати — Київ.

## TimeField

Сегменти «години : хвилини» (`role="spinbutton"`, 24 години), іконка годинника ліворуч, шеврон-кнопка праворуч. Фокусований сегмент — заливка `primary-tint` і колір `primary`. Цифри, ↑ ↓ ±1 із переходом через межу, PgUp / PgDn ±10, Home / End, Backspace очищає, ← → і «:» між сегментами. Поповер — два стовпці «Hour» / «Min» (липка шапка), крок хвилин `minuteStep`, підвал «Kyiv time» і «Done».

## NumberField і CurrencyField

Поле з табличними цифрами і кроком; `stepper` — `end` («−» і «+» справа), `split` («−» зліва, «+» справа), `none`. Кнопки кроку `aria-hidden`, поле — `spinbutton` з `aria-valuemin / max / now / valuetext`. ↑ ↓ ±step (⇧ — ×10), PgUp / PgDn — `largeStep`, Home / End — межі. Утримання «−» або «+» повторює крок із прискоренням (пауза 420ms, інтервал 150ms → 56ms) і множником ×2 / ×5 / ×10 після 1 / 2 / 3.2 с; множник показує чорна бульбашка `foreground` над полем. Колесо миші за замовчуванням вимкнене.

CurrencyField — символ валюти стоїть нерухомо ліворуч (`€`, `Intl.NumberFormat`), у спокої «€1,250.00», у фокусі — чисті цифри; розбір «1 250,5», «€1,250». У форму йде простий десятковий рядок `1250.00`. `align="right"` для стовпців сум. Помилка діапазону: «Enter an amount between €0.00 and €5,000.00.»

## Do / Don't

- Do: «Kyiv time» поруч із підписом поля дати чи часу; числа й дати з `tabular-nums`; помилка під полем із `role="alert"`.
- Don't: системні `<input type="date|time|number">`; час без «Kyiv time» у рядку підпису; колесо миші, що міняє значення без наміру.
