import { describe, expect, it } from "vitest";
import { equalSplitParts, sumFloats } from "@/lib/calculations/split";
import { remainingBudget } from "@/lib/calculations/budget";
import { loanRemainingBalance } from "@/lib/calculations/loan";
import { getPasswordValidationMessage } from "@/lib/auth/password";

describe("equalSplitParts", () => {
  it("splits evenly with cent remainder on first participants", () => {
    expect(equalSplitParts(10, 3)).toEqual([3.34, 3.33, 3.33]);
  });

  it("returns empty array for zero count", () => {
    expect(equalSplitParts(10, 0)).toEqual([]);
  });
});

describe("sumFloats", () => {
  it("rounds to two decimal places", () => {
    expect(sumFloats([0.1, 0.2])).toBe(0.3);
  });
});

describe("remainingBudget", () => {
  it("computes remaining amount", () => {
    expect(remainingBudget(100, 35.5)).toBe(64.5);
  });
});

describe("loanRemainingBalance", () => {
  it("never returns negative remaining", () => {
    expect(loanRemainingBalance(100, 150)).toBe(0);
  });
});

describe("password validation", () => {
  it("rejects weak passwords", () => {
    expect(getPasswordValidationMessage("short")).toBeTruthy();
  });
});
