// Навігація підрядника (AC-VENDOR-08): у бічній панелі й ⌘K — лише Runs; шаблонів і головної агенції немає.
// Справжній AppShell; заглушка — лише next/navigation (фреймворк).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/runs", useRouter: () => ({ push: () => {} }) }));

const { AppShell, navFor, navigationCommands } = await import("@/components/ui/app-shell");

const shell = (role: string) =>
  renderToStaticMarkup(
    <AppShell email={`${role}@example.test`} role={role} signOutAction={async () => {}}>
      <p>content</p>
    </AppShell>,
  );

describe("Навігація підрядника", () => {
  it("AC-VENDOR-08: у навігації підрядника лише Runs — без Templates і Home", () => {
    expect(navFor("vendor").map((item) => item.href)).toEqual(["/runs"]);
    const html = shell("vendor");
    expect(html).toContain('href="/runs"');
    expect(html).not.toContain('href="/templates"');
    expect(html).not.toMatch(/>Templates</);
  });

  it("AC-VENDOR-08: у ⌘K підрядника лише «Go to Runs», без шаблонів і «Launch a template»", () => {
    expect(navigationCommands("vendor").map((c) => c.label)).toEqual(["Go to Runs"]);
  });

  it("AC-VENDOR-08: менеджер і далі бачить Home, Templates, Runs і «Launch a template»", () => {
    expect(navFor("manager").map((item) => item.href)).toEqual(["/", "/templates", "/runs"]);
    expect(navigationCommands("manager").map((c) => c.label)).toEqual(["Go to Home", "Go to Templates", "Go to Runs", "Launch a template"]);
    expect(shell("manager")).toContain('href="/templates"');
  });
});
