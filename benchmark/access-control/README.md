# Access Control

A small TypeScript document service with role-based access.

Each document belongs to a workspace. Members have a role in that workspace: viewer, editor, or admin.
Requests carry a session token, which the service resolves to a user. The service then decides whether
that user may read, edit, or delete the document, and writes every decision to an audit log.

## Layout

- `src/roles.ts`: roles and what each role may do.
- `src/sessions.ts`: session tokens and expiry.
- `src/documents.ts`: the document and membership stores.
- `src/audit.ts`: the audit log.
- `src/access.ts`: the access decision and request handler.
