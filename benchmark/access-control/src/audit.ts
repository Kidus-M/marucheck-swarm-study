import type { Action } from "./roles.js";

export interface AuditEntry {
  readonly action: Action;
  readonly allowed: boolean;
  readonly documentId: string;
  readonly userId: string | null;
}

export class AuditLog {
  private readonly entries: AuditEntry[] = [];

  public write(entry: AuditEntry): void {
    this.entries.push(entry);
  }

  public all(): readonly AuditEntry[] {
    return [...this.entries];
  }
}
