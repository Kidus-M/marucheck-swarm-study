import { describe, expect, it } from "vitest";
import { checkQuota } from "./quota.js";

describe("checkQuota", () => {
  it("allows a free user under the limit", () => {
    const decision = checkQuota({ plan: "free", status: "active", userId: "u" }, { userId: "u" }, 3);
    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(7);
  });

  it("does not meter pro users", () => {
    const decision = checkQuota({ plan: "pro", status: "active", userId: "u" }, { userId: "u" }, 500);
    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBeNull();
  });
});
