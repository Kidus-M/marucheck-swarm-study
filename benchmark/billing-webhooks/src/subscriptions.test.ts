import { describe, expect, it } from "vitest";
import { hasProAccess, SubscriptionStore } from "./subscriptions.js";

describe("SubscriptionStore", () => {
  it("defaults unknown customers to free", () => {
    expect(new SubscriptionStore().get("c")).toBe("free");
  });

  it("gives pro access only in the pro state", () => {
    const store = new SubscriptionStore();
    store.set("c", "pro");
    expect(hasProAccess(store, "c")).toBe(true);
    store.set("c", "canceled");
    expect(hasProAccess(store, "c")).toBe(false);
  });
});
