// Числа для NumberField / CurrencyField: розбір «людського» введення, округлення без дрейфу плаваючої коми.

export const clampNumber = (v: number, min = -Infinity, max = Infinity) => Math.min(max, Math.max(min, v));

export function roundTo(v: number, decimals: number): number {
  if (String(v).includes("e")) return Number(v.toFixed(decimals));
  return Number(Math.round(Number(`${v}e${decimals}`)) + `e-${decimals}`);
}

/** Кількість знаків після коми в числі (для кроку 0.25 → 2). */
export function decimalsOf(n: number): number {
  const s = String(n);
  if (s.includes("e-")) return Number(s.split("e-")[1]);
  return s.includes(".") ? s.split(".")[1].length : 0;
}

/** Рядок для форми й сервера: крапка, без розділювачів тисяч. */
export const toPlain = (v: number | null, decimals: number) => (v === null ? "" : v.toFixed(decimals));

/**
 * Розбирає введення: «€1,250.00», «1 250,5», «1.250,50», «-12». Остання кома чи крапка — десяткова; єдина кома з
 * трьома цифрами після неї («1,250») — розділювач тисяч. `null` — не число.
 */
export function parseDecimal(text: string): number | null {
  let s = text.replace(/[\s  ]/g, "").replace("−", "-").replace(/[^\d.,-]/g, "");
  const negative = s.startsWith("-");
  s = s.replace(/-/g, "");
  if (!/\d/.test(s)) return null;
  const sep = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  if (sep >= 0) {
    const char = s[sep];
    const tail = s.slice(sep + 1);
    const other = char === "," ? "." : ",";
    const onlyThisSeparator = !s.includes(other);
    const repeated = s.split(char).length > 2;
    const thousands = onlyThisSeparator && (repeated || (char === "," && tail.length === 3));
    s = thousands ? s.replaceAll(char, "") : `${s.slice(0, sep).replace(/[.,]/g, "")}.${tail}`;
  }
  const v = Number.parseFloat(s);
  return Number.isFinite(v) ? (negative ? -v : v) : null;
}
