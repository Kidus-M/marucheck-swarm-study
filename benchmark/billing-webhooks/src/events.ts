export type BillingEvent =
  | { readonly customerId: string; readonly id: string; readonly invoiceId: string; readonly amountCents: number; readonly type: "payment.succeeded" }
  | { readonly customerId: string; readonly id: string; readonly invoiceId: string; readonly amountCents: number; readonly type: "payment.refunded" }
  | { readonly customerId: string; readonly id: string; readonly type: "subscription.canceled" };

/** Remembers which provider events have been applied. */
export class ProcessedEvents {
  private readonly seen = new Set<string>();

  public has(eventId: string): boolean {
    return this.seen.has(eventId);
  }

  public add(eventId: string): void {
    this.seen.add(eventId);
  }
}
