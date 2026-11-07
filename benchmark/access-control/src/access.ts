import type { AuditLog } from "./audit.js";
import type { Document, DocumentStore, Memberships } from "./documents.js";
import { can, type Action } from "./roles.js";
import type { SessionStore } from "./sessions.js";

export interface AccessContext {
  readonly audit: AuditLog;
  readonly documents: DocumentStore;
  readonly memberships: Memberships;
  readonly sessions: SessionStore;
}

export interface AccessRequest {
  readonly action: Action;
  readonly documentId: string;
  readonly token: string;
}

export interface AccessResult {
  readonly document?: Document;
  readonly status: 200 | 401 | 403 | 404;
}

export function handleAccess(
  context: AccessContext,
  request: AccessRequest,
  now: number,
): AccessResult {
  const userId = context.sessions.resolve(request.token, now) ?? null;
  const finish = (allowed: boolean, result: AccessResult): AccessResult => {
    context.audit.write({
      action: request.action,
      allowed,
      documentId: request.documentId,
      userId,
    });
    return result;
  };

  if (userId === null) return finish(false, { status: 401 });

  const document = context.documents.get(request.documentId);
  if (document === undefined) return finish(false, { status: 404 });

  const role = context.memberships.roleOf(document.workspaceId, userId);
  if (role === undefined || !can(role, request.action)) return finish(false, { status: 403 });

  if (request.action === "delete") context.documents.delete(document.id);
  return finish(true, { document, status: 200 });
}
