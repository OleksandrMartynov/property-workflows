import { Card } from "@/components/ui/card";
import { PageShell } from "@/app/_components/ui";
import { requireViewer } from "@/lib/supabase/viewer";

// Власний профіль (матриця прав «See own profile» — yes для кожної ролі): email і роль того, хто відкрив сторінку.
// Пункт «Profile» — у навігації підрядника поруч із «Runs» (AC-VENDOR-13). Дані — лише з requireViewer(): власний рядок
// profiles, інших користувачів сторінка не читає.
export default async function ProfilePage() {
  const { viewer } = await requireViewer();
  return (
    <PageShell title="Profile">
      <Card className="max-w-xl p-4">
        <dl className="flex flex-col gap-3 text-body">
          <div className="flex flex-col gap-0.5">
            <dt className="text-label text-muted-foreground">Email</dt>
            <dd className="break-words">{viewer.email}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-label text-muted-foreground">Role</dt>
            <dd data-testid="user-role" className="capitalize">
              {viewer.role}
            </dd>
          </div>
        </dl>
      </Card>
    </PageShell>
  );
}
