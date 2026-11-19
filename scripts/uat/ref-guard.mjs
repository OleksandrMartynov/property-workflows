// WS11, staging з окремою базою (промпт R03 курсу): UAT пише в базу з ключами з .env.local (синтетичні uat-*
// користувачі й дані), а браузер ходить на розгорнуту адресу. Якщо .env.local веде в одну базу, а адреса — в іншу
// (напр. .env.local = staging, а --url = прод), записи з'являться не там, де їх перевіряє браузер. Тому перед
// першим записом звіряємо ref проєкту Supabase: з /api/health цільової адреси (поле supabaseRef) і з
// NEXT_PUBLIC_SUPABASE_URL у .env.local. Друкуємо лише ref — він публічний; ключів і рядків підключення тут немає.

const SUPABASE_HOST = /^([a-z0-9]{1,40})\.supabase\.co$/;

/** Ref — перший сегмент хоста `<ref>.supabase.co`; інакше null (та сама логіка, що supabaseRefOf у src/lib/health.ts). */
export function supabaseRefFromUrl(raw) {
  try {
    return new URL(raw ?? "").hostname.toLowerCase().match(SUPABASE_HOST)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** null — можна писати; рядок — чому UAT зупинено. */
export function checkUatTarget({ base, healthRef, localRef }) {
  if (!localRef) return "NEXT_PUBLIC_SUPABASE_URL у .env.local не задано або це не адреса проєкту Supabase — не знаю, у яку базу піде запис.";
  if (!healthRef) {
    return `${base}/api/health не повідомив supabaseRef (старий деплой чи захист Vercel без VERCEL_AUTOMATION_BYPASS_SECRET) — звірити бази неможливо.`;
  }
  if (healthRef !== localRef) {
    return `адреса ${base} працює з базою ${healthRef}, а .env.local — з ${localRef}: записи UAT потрапили б не в ту базу. Запустіть UAT проти staging (npm run uat -- --url <staging>) або перемкніть .env.local.`;
  }
  return null;
}

/** supabaseRef з /api/health; з VERCEL_AUTOMATION_BYPASS_SECRET — із заголовком обходу захисту Vercel (лише коли задано). */
export async function fetchHealthRef(base, bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  try {
    const res = await fetch(`${base}/api/health`, {
      redirect: "manual",
      headers: bypass ? { "x-vercel-protection-bypass": bypass } : {},
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.headers.get("content-type")?.includes("json")) return null;
    return (await res.json()).supabaseRef ?? null;
  } catch {
    return null;
  }
}
