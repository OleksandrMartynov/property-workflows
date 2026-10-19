import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "./_components/ui";

// Головна: хто увійшов і куди далі. Сторінка читає cookies, тому рендериться динамічно.
export default async function Home() {
  const supabase = await createClient();

  // getClaims() перевіряє JWT. getSession() для авторизації на сервері не використовуємо.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) {
    redirect("/login");
  }

  // RLS: користувач бачить лише власний профіль.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  return (
    <PageShell title="Property workflows" email={profile?.email ?? claims.email} role={profile?.role}>
      {profile ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          <li>
            <Link href="/templates" className="block rounded border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800">
              <span className="font-medium">Templates</span>
              <span className="block text-sm text-zinc-500">Launch a template for a case</span>
            </Link>
          </li>
          <li>
            <Link href="/runs" className="block rounded border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800">
              <span className="font-medium">Runs</span>
              <span className="block text-sm text-zinc-500">Runs you manage or have tasks in</span>
            </Link>
          </li>
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">Profile not found — ask an administrator.</p>
      )}
    </PageShell>
  );
}
