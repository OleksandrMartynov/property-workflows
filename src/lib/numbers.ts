// Числа для NumberField / CurrencyField: розбір «людського» введення, округлення без дрейфу плаваючої коми.

export const clampNumber = (v: number, min = -Infinity, max = Infinity) => Math.min(max, Math.max(min, v));

/** Округлення половинок від нуля для обох знаків: roundTo(1.005, 2) = 1.01, roundTo(-1.005, 2) = -1.01. */
export function roundTo(v: number, decimals: number): number {
  const sign = v < 0 ? -1 : 1;
  const abs = Math.abs(v);
  if (String(abs).includes("e")) return sign * Number(abs.toFixed(decimals)) || 0;
  return sign * Number(Math.round(Number(`${abs}e${decimals}`)) + `e-${decimals}`) || 0;
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
 * трьома цифрами після неї («1,250») — розділювач тисяч, крім «0,500». `null` — не число.
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
    // «0,500» — десятковий запис: число з розділювачем тисяч не починається з нуля.
    const leadingZero = /^0[.,]/.test(s);
    const thousands = onlyThisSeparator && (repeated || (char === "," && tail.length === 3 && !leadingZero));
    s = thousands ? s.replaceAll(char, "") : `${s.slice(0, sep).replace(/[.,]/g, "")}.${tail}`;
  }
  const v = Number.parseFloat(s);
  return Number.isFinite(v) ? (negative ? -v : v) : null;
}
