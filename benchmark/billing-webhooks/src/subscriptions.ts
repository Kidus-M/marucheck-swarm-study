export type SubscriptionState = "free" | "pro" | "canceled";

export class SubscriptionStore {
  private readonly states = new Map<string, SubscriptionState>();

  public get(customerId: string): SubscriptionState {
    return this.states.get(customerId) ?? "free";
  }

  public set(customerId: string, state: SubscriptionState): void {
    this.states.set(customerId, state);
  }
}

export function hasProAccess(store: SubscriptionStore, customerId: string): boolean {
  return store.get(customerId) === "pro";
}
