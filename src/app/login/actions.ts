"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";

// Вхід email + пароль. Реєстрації в шаблоні немає: користувачів створює
// scripts/create-demo-users.mjs (Admin API), бо вбудований SMTP Supabase
// надсилає лише 2 листи/год і лише членам команди проєкту.
// Після входу — на сторінку, на яку вело посилання (AC-DSYS-08): прихований next проходить safeNext (лише відносний шлях
// цього сайту, інакше «/»), тож вхід не стає відкритим перенаправленням. Помилка входу зберігає next у адресі.
export async function login(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const back = (error: string) => `/login?error=${error}${next === "/" ? "" : `&next=${encodeURIComponent(next)}`}`;
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(back("missing"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Не показуємо текст помилки Auth: він може підказати, чи існує email.
    redirect(back("invalid"));
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
