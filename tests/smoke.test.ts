import { describe, expect, it } from "vitest";

describe("toolchain", () => {
  it("runs vitest with TypeScript", () => {
    const sum = (a: number, b: number): number => a + b;
    expect(sum(2, 3)).toBe(5);
  });
});
