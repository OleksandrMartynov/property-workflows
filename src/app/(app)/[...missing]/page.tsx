import { notFound } from "next/navigation";

// Невідома адреса для того, хто увійшов: «Page not found» у каркасі застосунку ((app)/not-found.tsx), а не кореневий
// 404 без бічної панелі. Відомі маршрути (/login, /runs, /templates…) конкретніші й мають пріоритет.
export default function MissingPage() {
  notFound();
}
