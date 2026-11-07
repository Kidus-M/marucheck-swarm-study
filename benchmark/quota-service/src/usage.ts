/** Usage is bucketed by calendar month in UTC. */
export function monthKey(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${String(date.getUTCFullYear())}-${month}`;
}

export class UsageStore {
  private readonly counts = new Map<string, number>();

  public used(userId: string, month: string): number {
    return this.counts.get(`${userId}:${month}`) ?? 0;
  }

  public record(userId: string, month: string, amount = 1): number {
    const next = this.used(userId, month) + amount;
    this.counts.set(`${userId}:${month}`, next);
    return next;
  }
}
