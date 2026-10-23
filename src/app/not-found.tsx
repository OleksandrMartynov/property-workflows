import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Logo } from "@/components/ui/logo";

// Невідома адреса: той самий тихий стан, що й «Run not found», але без даних і з дорогою додому.
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <Link href="/" className="no-underline">
        <Logo />
      </Link>
      <EmptyState
        title="Page not found"
        action={
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Back to home
          </Link>
        }
      />
    </main>
  );
}
