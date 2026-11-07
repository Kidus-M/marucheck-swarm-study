/** Contract regression suite. Owned by the humans who own the Quality Contract. */
import { describe, expect, it } from "vitest";
import { handleGenerate } from "../src/api.js";
import type { Subscription } from "../src/plans.js";
import { UsageStore } from "../src/usage.js";

const JUNE = new Date("2026-06-15T12:00:00.000Z");
const JULY = new Date("2026-07-01T00:00:00.000Z");

function lookupFor(...subscriptions: Subscription[]) {
  return (userId: string): Subscription | undefined =>
    subscriptions.find((subscription) => subscription.userId === userId);
}

function exhaust(store: UsageStore, lookup: ReturnType<typeof lookupFor>, userId: string, n: number) {
  return Array.from({ length: n }, () => handleGenerate(store, lookup, { userId }, JUNE).status);
}

describe("usage-quota#QS-001", () => {
  it("allows exactly ten generations a month on the free plan", () => {
    const lookup = lookupFor({ plan: "free", status: "active", userId: "a" });
    const statuses = exhaust(new UsageStore(), lookup, "a", 12);
    expect(statuses.filter((status) => status === 200)).toHaveLength(10);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });
});

describe("usage-quota#QS-002", () => {
  it("never limits an active pro account", () => {
    const lookup = lookupFor({ plan: "pro", status: "active", userId: "a" });
    expect(new Set(exhaust(new UsageStore(), lookup, "a", 200))).toEqual(new Set([200]));
  });
});

describe("usage-quota#QS-003", () => {
  it("meters a canceled pro subscription as free", () => {
    const lookup = lookupFor({ plan: "pro", status: "canceled", userId: "a" });
    const statuses = exhaust(new UsageStore(), lookup, "a", 11);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe("usage-quota#QS-004", () => {
  it("does not count a denied generation against usage", () => {
    const store = new UsageStore();
    const lookup = lookupFor({ plan: "free", status: "active", userId: "a" });
    exhaust(store, lookup, "a", 15);
    expect(store.used("a", "2026-06")).toBe(10);
  });
});

describe("usage-quota#QS-005", () => {
  it("resets usage when the calendar month changes", () => {
    const store = new UsageStore();
    const lookup = lookupFor({ plan: "free", status: "active", userId: "a" });
    exhaust(store, lookup, "a", 10);
    expect(handleGenerate(store, lookup, { userId: "a" }, JUNE).status).toBe(429);
    expect(handleGenerate(store, lookup, { userId: "a" }, JULY).status).toBe(200);
  });
});

describe("usage-quota#QS-INV-001", () => {
  it("ignores a plan claimed by the client", () => {
    const store = new UsageStore();
    const lookup = lookupFor({ plan: "free", status: "active", userId: "a" });
    exhaust(store, lookup, "a", 10);
    const response = handleGenerate(store, lookup, { claimedPlan: "pro", userId: "a" }, JUNE);
    expect(response.status).toBe(429);
    expect(response.decision?.plan).toBe("free");
  });
});

describe("usage-quota#QS-INV-002", () => {
  it("keeps one user's usage separate from another's", () => {
    const store = new UsageStore();
    const lookup = lookupFor(
      { plan: "free", status: "active", userId: "a" },
      { plan: "free", status: "active", userId: "b" },
    );
    exhaust(store, lookup, "a", 10);
    expect(handleGenerate(store, lookup, { userId: "b" }, JUNE).status).toBe(200);
  });
});

describe("usage-quota#QS-INV-003", () => {
  it("refuses a user with no stored subscription", () => {
    const store = new UsageStore();
    expect(handleGenerate(store, lookupFor(), { userId: "ghost" }, JUNE).status).toBe(404);
    expect(store.used("ghost", "2026-06")).toBe(0);
  });
});
