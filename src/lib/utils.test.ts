import { describe, expect, it } from "vitest";
import { hasSizeClass } from "./utils";

describe("hasSizeClass", () => {
  it("бачить власний розмір споживача, зокрема довільний", () => {
    expect(hasSizeClass("size-3.5 text-primary")).toBe(true);
    expect(hasSizeClass("absolute size-[38rem]")).toBe(true);
  });

  it("не плутає з іншими утилітами й порожнім класом", () => {
    expect(hasSizeClass("text-primary")).toBe(false);
    expect(hasSizeClass("max-size-4")).toBe(false);
    expect(hasSizeClass(undefined)).toBe(false);
  });
});
