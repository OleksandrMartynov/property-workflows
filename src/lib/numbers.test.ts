import { describe, expect, it } from "vitest";
import { clampNumber, decimalsOf, parseDecimal, roundTo, toPlain } from "./numbers";

describe("numbers: розбір введення", () => {
  it("розбирає валюту з розділювачами тисяч", () => {
    expect(parseDecimal("€1,250.00")).toBe(1250);
    expect(parseDecimal("1 250,5")).toBe(1250.5);
    expect(parseDecimal("1.250,50")).toBe(1250.5);
    expect(parseDecimal("1,250,000")).toBe(1250000);
  });

  it("відрізняє десятковий розділювач від тисяч", () => {
    expect(parseDecimal("12,5")).toBe(12.5);
    expect(parseDecimal("1,250")).toBe(1250);
    expect(parseDecimal("0.75")).toBe(0.75);
  });

  it("розуміє мінус і відкидає не-числа", () => {
    expect(parseDecimal("-12")).toBe(-12);
    expect(parseDecimal("−7.5")).toBe(-7.5);
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("-")).toBeNull();
    expect(parseDecimal("")).toBeNull();
  });
});

describe("numbers: округлення і крок", () => {
  it("округлює без дрейфу плаваючої коми", () => {
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(2.5, 0)).toBe(3);
  });

  it("рахує знаки кроку й обмежує межами", () => {
    expect(decimalsOf(0.25)).toBe(2);
    expect(decimalsOf(50)).toBe(0);
    expect(clampNumber(6200, 0, 5000)).toBe(5000);
    expect(clampNumber(-3, 0)).toBe(0);
  });

  it("віддає форматований рядок для форми", () => {
    expect(toPlain(1250, 2)).toBe("1250.00");
    expect(toPlain(null, 2)).toBe("");
  });
});
