import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { MESSAGES } from "@/lib/runs/messages";
import { isVendor, type AppRole } from "@/lib/supabase/viewer";
import { PageShell } from "./ui";

// AC-EDITOR-07, AC-DSYS-02: сторінка, на яку роль не має прав, — «Not enough rights» і «Back to templates» у тому самому
// каркасі, що й інші сторінки (AppShell групи (app)), без жодного вмісту захищеної сторінки. AC-VENDOR-08: підряднику —
// «Back to runs», бо шаблони для нього закриті всі (посилання на /templates вело б на ту саму відмову).
export function Forbidden({ title, role }: { title: string; role?: AppRole }) {
  const back = role && isVendor(role) ? { href: "/runs", label: "Back to runs" } : { href: "/templates", label: "Back to templates" };
  return (
    <PageShell title={title}>
      <div className="flex flex-col items-start gap-4">
        <Alert variant="error">
          <span data-testid="forbidden">{MESSAGES.NOT_ALLOWED_TEMPLATES}</span>
        </Alert>
        <Link href={back.href} className={buttonVariants({ variant: "outline" })}>
          {back.label}
        </Link>
      </div>
    </PageShell>
  );
}
