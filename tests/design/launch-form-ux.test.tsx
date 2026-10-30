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
  it("має рівно одну кнопку запуску", () => {
    expect(html.match(/type="submit"/g)).toHaveLength(1);
    expect(html).toMatch(/>Launch</);
  });

  it("заголовок «Who does what» — один, підсумок у прев'ю — «Assignees»", () => {
    expect(html.match(/Who does what/g)).toHaveLength(1);
    expect(html).toContain(">Assignees<");
  });
});
