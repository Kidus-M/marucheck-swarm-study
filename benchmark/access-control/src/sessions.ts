export const SESSION_LIFETIME_MS = 60 * 60 * 1000;

export interface Session {
  readonly expiresAt: number;
  readonly token: string;
  readonly userId: string;
}

export class SessionStore {
  private readonly sessions = new Map<string, Session>();

  public issue(token: string, userId: string, now: number): Session {
    const session = { expiresAt: now + SESSION_LIFETIME_MS, token, userId };
    this.sessions.set(token, session);
    return session;
  }

  public revoke(token: string): void {
    this.sessions.delete(token);
  }

  /** The user behind a token, or undefined if it is unknown, revoked, or expired. */
  public resolve(token: string, now: number): string | undefined {
    const session = this.sessions.get(token);
    return session === undefined || session.expiresAt <= now ? undefined : session.userId;
  }
}
