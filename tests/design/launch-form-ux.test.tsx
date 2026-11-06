// Форма запуску (docs/ux/ux-plan.md, партія 6): одна кнопка «Launch» (⌘Enter знаходить саме її) і один заголовок
// «Who does what»; підсумок у прев'ю — «Assignees».
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LaunchForm } from "@/app/(app)/templates/[id]/launch/_components/launch-form";

const html = renderToStaticMarkup(
  <LaunchForm
    templateId="10000000-0000-0000-0000-000000000001"
    templateName="Tenant move-in"
    sections={[{ id: "s1", name: "Before move-in" }]}
    tasks={[{ id: "t1", section_id: "s1", name: "Sign the lease agreement", required: true }]}
    viewer={{ id: "u1", email: "manager.a@example.test" }}
    others={[]}
    caseName=""
    action={async () => {}}
  />,
);

describe("Форма запуску", () => {
  it("AC-RUN-01: має рівно одну кнопку запуску «Launch» (⌘Enter натискає саме її)", () => {
    expect(html.match(/type="submit"/g)).toHaveLength(1);
    expect(html).toMatch(/>Launch</);
  });

  it("AC-RUN-04: заголовок «Who does what» (призначення виконавців) — один, підсумок у прев'ю — «Assignees»", () => {
    expect(html.match(/Who does what/g)).toHaveLength(1);
    expect(html).toContain(">Assignees<");
  });
});

describe("Форма запуску: виконавці за секціями", () => {
  const two = renderToStaticMarkup(
    <LaunchForm
      templateId="10000000-0000-0000-0000-000000000001"
      templateName="Tenant move-in"
      sections={[
        { id: "s1", name: "Before move-in" },
        { id: "s2", name: "Move-in day" },
      ]}
      tasks={[
        { id: "t1", section_id: "s1", name: "Sign the lease agreement", required: true },
        { id: "t2", section_id: "s2", name: "Hand over the keys", required: true },
      ]}
      viewer={{ id: "u1", email: "manager.a@example.test" }}
      others={[{ id: "u2", email: "vendor.v@example.test" }]}
      caseName=""
      action={async () => {}}
    />,
  );

  it("AC-RUN-04: у кожній секції — «Assign section to…», і він не додає поля у форму (виконавці йдуть лише полями задач)", () => {
    expect(two).toContain('aria-label="Assign all tasks of Before move-in to"');
    expect(two).toContain('aria-label="Assign all tasks of Move-in day to"');
    // Поля форми з виконавцями — по одному на задачу, за замовчуванням — той, хто запускає (менеджер запуску).
    expect(two.match(/<input type="hidden" name="assignee_[^"]+" value="u1"/g)).toHaveLength(2);
    expect(two.match(/<input type="hidden" value=""/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
});
