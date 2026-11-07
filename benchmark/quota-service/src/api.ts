import type { Subscription } from "./plans.js";
import { checkQuota, type GenerationRequest, type QuotaDecision } from "./quota.js";
import { monthKey, type UsageStore } from "./usage.js";

export interface GenerateResponse {
  readonly decision?: QuotaDecision;
  readonly status: 200 | 403 | 404 | 429;
}

export type SubscriptionLookup = (userId: string) => Subscription | undefined;

export function handleGenerate(
  store: UsageStore,
  lookup: SubscriptionLookup,
  request: GenerationRequest,
  now: Date,
): GenerateResponse {
  const subscription = lookup(request.userId);
  if (subscription === undefined) return { status: 404 };

  const month = monthKey(now);
  const decision = checkQuota(subscription, request, store.used(request.userId, month));
  if (!decision.allowed) {
    return { decision, status: decision.remaining === 0 ? 429 : 403 };
  }

  store.record(request.userId, month);
  return { decision, status: 200 };
}
