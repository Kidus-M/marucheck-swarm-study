export type PlanTier = "free" | "pro";
export type SubscriptionStatus = "active" | "canceled";

export const FREE_MONTHLY_LIMIT = 10;

export interface Subscription {
  readonly plan: PlanTier;
  readonly status: SubscriptionStatus;
  readonly userId: string;
}

/** The monthly generation limit for a plan. Null means unmetered. */
export function limitFor(plan: PlanTier): number | null {
  return plan === "free" ? FREE_MONTHLY_LIMIT : null;
}

/** A canceled subscription keeps its record but loses its paid plan. */
export function effectivePlan(subscription: Subscription): PlanTier {
  return subscription.status === "active" ? subscription.plan : "free";
}
