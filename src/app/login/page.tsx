import type { CSSProperties } from "react";
import { HeroStage } from "@/components/ui/hero-stage";
import { Logo, LogoMark } from "@/components/ui/logo";
import { login } from "./actions";
import { LoginForm } from "./login-form";

const ERRORS: Record<string, string> = {
  missing: "Enter your email and password.",
  invalid: "Invalid email or password.",
};

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="grid min-h-dvh flex-1 lg:grid-cols-[minmax(28rem,0.82fr)_minmax(0,1.18fr)]">
      <div
        aria-hidden="true"
        className="relative h-28 overflow-hidden bg-stage bg-[radial-gradient(70%_120%_at_15%_0%,var(--stage-glow-1),transparent),radial-gradient(60%_110%_at_90%_100%,var(--stage-glow-2),transparent)] lg:hidden"
      >
        <LogoMark className="absolute -bottom-6 -right-4 size-32 text-stage-foreground/15" />
      </div>
      <section className="relative isolate flex flex-col overflow-hidden px-6 py-8 sm:px-14">
        {/* Фактура панелі: м'яке сяйво primary зверху й точкова сітка, що розчиняється до краю. Лише токени. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90%_55%_at_25%_0%,color-mix(in_oklab,var(--primary)_11%,transparent),transparent)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_14%,transparent)_1px,transparent_1.2px)] [background-size:22px_22px] [mask-image:radial-gradient(75%_60%_at_40%_45%,var(--foreground),transparent)]"
        />

        <LogoMark
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 -left-28 -z-10 size-[38rem] text-primary/[0.07]"
        />

        <Logo className="animate-ui-reveal" />

        <div className="mx-auto flex w-full max-w-[27rem] flex-1 flex-col justify-center py-10">
          <div
            style={{ "--reveal-delay": "120ms" } as CSSProperties}
            className="animate-ui-reveal flex flex-col gap-9 rounded-2xl border border-border bg-card/85 p-10 shadow-lg backdrop-blur-sm"
          >
            <h1 className="text-[2rem] font-semibold leading-9 tracking-[-0.03em]">Sign in</h1>
            <LoginForm action={login} serverError={message} />
          </div>
        </div>

      </section>

      <aside className="hidden lg:block">
        <HeroStage />
      </aside>
    </main>
  );
}
