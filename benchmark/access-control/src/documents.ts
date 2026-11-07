import type { Role } from "./roles.js";

export interface Document {
  readonly body: string;
  readonly id: string;
  readonly workspaceId: string;
}

export class DocumentStore {
  private readonly documents = new Map<string, Document>();

  public get(id: string): Document | undefined {
    return this.documents.get(id);
  }

  public put(document: Document): void {
    this.documents.set(document.id, document);
  }

  public delete(id: string): void {
    this.documents.delete(id);
  }
}

export class Memberships {
  private readonly roles = new Map<string, Role>();

  public grant(workspaceId: string, userId: string, role: Role): void {
    this.roles.set(`${workspaceId}:${userId}`, role);
  }

  public roleOf(workspaceId: string, userId: string): Role | undefined {
    return this.roles.get(`${workspaceId}:${userId}`);
  }
}
