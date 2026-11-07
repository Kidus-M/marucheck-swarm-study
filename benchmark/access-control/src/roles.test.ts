import { describe, expect, it } from "vitest";
import { can } from "./roles.js";

describe("can", () => {
  it("lets an editor edit", () => {
    expect(can("editor", "edit")).toBe(true);
  });

  it("lets a viewer read", () => {
    expect(can("viewer", "read")).toBe(true);
  });
});
