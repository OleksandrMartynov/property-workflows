import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

// «Не знайдено» всередині застосунку — у каркасі, з дорогою додому; текст той самий, що й у кореневому not-found.
export default function AppNotFound() {
  return (
    <EmptyState
      title="Page not found"
      action={
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to home
        </Link>
      }
    />
  );
}
