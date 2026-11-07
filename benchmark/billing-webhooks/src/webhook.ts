import type { BillingEvent, ProcessedEvents } from "./events.js";
import type { InvoiceStore } from "./invoices.js";
import { verifySignature } from "./signature.js";
import type { SubscriptionStore } from "./subscriptions.js";

export interface WebhookContext {
  readonly events: ProcessedEvents;
  readonly invoices: InvoiceStore;
  readonly secret: string;
  readonly subscriptions: SubscriptionStore;
}

export interface WebhookRequest {
  readonly body: string;
  readonly signature: string;
  readonly timestamp: number;
}

export function applyEvent(context: WebhookContext, event: BillingEvent): void {
  switch (event.type) {
    case "payment.succeeded":
      context.invoices.record({
        amountCents: event.amountCents,
        customerId: event.customerId,
        id: event.invoiceId,
        refundedCents: 0,
      });
      context.subscriptions.set(event.customerId, "pro");
      break;
    case "payment.refunded":
      context.invoices.refund(event.invoiceId, event.amountCents);
      context.subscriptions.set(event.customerId, "free");
      break;
    case "subscription.canceled":
      context.subscriptions.set(event.customerId, "canceled");
      break;
  }
}

export function handleWebhook(
  context: WebhookContext,
  request: WebhookRequest,
  nowSeconds: number,
): 200 | 400 | 401 {
  const valid = verifySignature(
    context.secret,
    request.timestamp,
    request.body,
    request.signature,
    nowSeconds,
  );
  if (!valid) return 401;

  let event: BillingEvent;
  try {
    event = JSON.parse(request.body) as BillingEvent;
  } catch {
    return 400;
  }

  if (context.events.has(event.id)) return 200;
  applyEvent(context, event);
  context.events.add(event.id);
  return 200;
}
