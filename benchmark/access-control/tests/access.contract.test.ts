/** Contract regression suite. Owned by the humans who own the Quality Contract. */
import { beforeEach, describe, expect, it } from "vitest";
import { handleAccess, type AccessContext } from "../src/access.js";
import { AuditLog } from "../src/audit.js";
import { DocumentStore, Memberships } from "../src/documents.js";
import { SESSION_LIFETIME_MS, SessionStore } from "../src/sessions.js";

const NOW = 1_800_000_000_000;
let context: AccessContext;

beforeEach(() => {
  context = {
    audit: new AuditLog(),
    documents: new DocumentStore(),
    memberships: new Memberships(),
    sessions: new SessionStore(),
  };
  context.documents.put({ body: "secret", id: "d", workspaceId: "w" });
  context.memberships.grant("w", "viewer", "viewer");
  context.memberships.grant("w", "editor", "editor");
  context.memberships.grant("w", "admin", "admin");
  context.memberships.grant("other", "outsider", "admin");
  for (const user of ["viewer", "editor", "admin", "outsider"]) {
    context.sessions.issue(`t-${user}`, user, NOW);
  }
});

const ask = (user: string, action: "read" | "edit" | "delete", now = NOW) =>
  handleAccess(context, { action, documentId: "d", token: `t-${user}` }, now).status;

describe("access#AC-001", () => {
  it("lets every workspace role read", () => {
    expect([ask("viewer", "read"), ask("editor", "read"), ask("admin", "read")]).toEqual([
      200, 200, 200,
    ]);
  });
});

describe("access#AC-002", () => {
  it("lets editors and admins edit, and not viewers", () => {
    expect([ask("viewer", "edit"), ask("editor", "edit"), ask("admin", "edit")]).toEqual([
      403, 200, 200,
    ]);
  });
});

describe("access#AC-003", () => {
  it("lets only admins delete", () => {
    expect([ask("viewer", "delete"), ask("editor", "delete")]).toEqual([403, 403]);
    expect(context.documents.get("d")).toBeDefined();
    expect(ask("admin", "delete")).toBe(200);
    expect(context.documents.get("d")).toBeUndefined();
  });
});

describe("access#AC-INV-001", () => {
  it("gives no access to a member of a different workspace", () => {
    expect(ask("outsider", "read")).toBe(403);
  });
});

describe("access#AC-INV-002", () => {
  it("refuses an unknown token", () => {
    const result = handleAccess(context, { action: "read", documentId: "d", token: "nope" }, NOW);
    expect(result.status).toBe(401);
    expect(result.document).toBeUndefined();
  });
});

describe("access#AC-INV-003", () => {
  it("refuses an expired session", () => {
    expect(ask("admin", "read", NOW + SESSION_LIFETIME_MS)).toBe(401);
  });

  it("refuses a revoked session", () => {
    context.sessions.revoke("t-admin");
    expect(ask("admin", "read")).toBe(401);
  });
});

describe("access#AC-INV-004", () => {
  it("records every allowed and denied decision", () => {
    ask("viewer", "read");
    ask("viewer", "delete");
    handleAccess(context, { action: "read", documentId: "d", token: "nope" }, NOW);
    expect(context.audit.all().map((entry) => [entry.userId, entry.allowed])).toEqual([
      ["viewer", true],
      ["viewer", false],
      [null, false],
    ]);
  });
});
