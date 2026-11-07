import { effectivePlan, limitFor, type PlanTier, type Subscription } from "./plans.js";

export interface GenerationRequest {
  /** Sent by the browser for display purposes. */
  readonly claimedPlan?: PlanTier;
  readonly userId: string;
}

export interface QuotaDecision {
  readonly allowed: boolean;
  readonly limit: number | null;
  readonly plan: PlanTier;
  readonly reason: string;
  readonly remaining: number | null;
}

export function checkQuota(
  subscription: Subscription,
  request: GenerationRequest,
  usedThisMonth: number,
): QuotaDecision {
  const plan = effectivePlan(subscription);
  const limit = limitFor(plan);

  if (request.userId !== subscription.userId) {
    return {
      allowed: false,
      limit,
      plan,
      reason: "The subscription does not belong to the requesting user.",
      remaining: 0,
    };
  }

  if (limit === null) {
    return { allowed: true, limit, plan, reason: "This plan is not metered.", remaining: null };
  }

  const remaining = Math.max(0, limit - usedThisMonth);
  return remaining === 0
    ? { allowed: false, limit, plan, reason: "The monthly limit has been reached.", remaining }
    : { allowed: true, limit, plan, reason: `${String(remaining)} remaining.`, remaining };
}
