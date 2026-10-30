// Каркас застосунку (docs/ux/ux-plan.md, партія 1): на телефоні — пошук і акаунт (email, роль, тема, «Sign out») так
// само, як у бічній панелі. Справжній AppShell; заглушка — лише next/navigation (фреймворк).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/runs", useRouter: () => ({ push: () => {} }) }));

const { AppShell } = await import("@/components/ui/app-shell");

const html = renderToStaticMarkup(
  <AppShell email="manager.b@example.test" role="manager" signOutAction={async () => {}}>
    <p>content</p>
  </AppShell>,
);
const mobileHeader = html.slice(html.indexOf("<header"), html.indexOf("</header>"));

describe("Каркас: мобільна смуга", () => {
  it("має кнопки «Search» і «Account» замість окремої «Sign out»", () => {
    expect(mobileHeader).toContain('aria-label="Search"');
    expect(mobileHeader).toContain('aria-label="Account"');
    expect(mobileHeader).not.toContain(">Sign out<");
  });

  it("email користувача з data-testid — рівно один на сторінці (UAT шукає його суворо)", () => {
    expect(html.match(/data-testid="user-email"/g)).toHaveLength(1);
  });
});
