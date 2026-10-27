import { describe, expect, it } from "vitest";
import { shownName } from "./display-name";

describe("shownName", () => {
  it("AC-EDITOR-20: стерта назва (порожня чи з пробілів) показується запасним текстом, звичайна — як є", () => {
    expect(shownName("", "template")).toBe("Untitled template");
    expect(shownName("   ", "section")).toBe("Untitled section");
    expect(shownName("", "task")).toBe("Untitled task");
    expect(shownName("Order cleaning", "task")).toBe("Order cleaning");
    expect(shownName(" Keys ", "task")).toBe("Keys");
  });
});
