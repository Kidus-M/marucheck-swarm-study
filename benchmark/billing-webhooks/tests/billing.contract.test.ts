/** Contract regression suite. Owned by the humans who own the Quality Contract. */
import { beforeEach, describe, expect, it } from "vitest";
import { ProcessedEvents, type BillingEvent } from "../src/events.js";
import { InvoiceStore } from "../src/invoices.js";
import { signPayload } from "../src/signature.js";
import { hasProAccess, SubscriptionStore } from "../src/subscriptions.js";
import { handleWebhook, type WebhookContext } from "../src/webhook.js";

const SECRET = "whsec_test";
const NOW = 1_800_000_000;
let context: WebhookContext;

function send(event: BillingEvent, options: { secret?: string; timestamp?: number } = {}) {
  const body = JSON.stringify(event);
  const timestamp = options.timestamp ?? NOW;
  const signature = signPayload(options.secret ?? SECRET, timestamp, body);
  return handleWebhook(context, { body, signature, timestamp }, NOW);
}

const paid = (id = "e1", invoiceId = "i1"): BillingEvent => ({
  amountCents: 2000,
  customerId: "c",
  id,
  invoiceId,
  type: "payment.succeeded",
});

beforeEach(() => {
  context = {
    events: new ProcessedEvents(),
    invoices: new InvoiceStore(),
    secret: SECRET,
    subscriptions: new SubscriptionStore(),
  };
});

describe("billing#BW-001", () => {
  it("grants pro access when a payment succeeds", () => {
    expect(send(paid())).toBe(200);
    expect(hasProAccess(context.subscriptions, "c")).toBe(true);
  });
});

describe("billing#BW-002", () => {
  it("removes pro access when the subscription is canceled", () => {
    send(paid());
    send({ customerId: "c", id: "e2", type: "subscription.canceled" });
    expect(hasProAccess(context.subscriptions, "c")).toBe(false);
  });
});

describe("billing#BW-003", () => {
  it("removes pro access when a payment is refunded", () => {
    send(paid());
    send({ amountCents: 2000, customerId: "c", id: "e2", invoiceId: "i1", type: "payment.refunded" });
    expect(hasProAccess(context.subscriptions, "c")).toBe(false);
  });
});

describe("billing#BW-004", () => {
  it("records the invoice for a successful payment", () => {
    send(paid());
    expect(context.invoices.get("i1")).toMatchObject({ amountCents: 2000, refundedCents: 0 });
  });
});

describe("billing#BW-INV-001", () => {
  it("rejects a webhook signed with the wrong secret and applies nothing", () => {
    expect(send(paid(), { secret: "whsec_other" })).toBe(401);
    expect(hasProAccess(context.subscriptions, "c")).toBe(false);
  });

  it("rejects a webhook with a tampered body", () => {
    const body = JSON.stringify(paid());
    const signature = signPayload(SECRET, NOW, body);
    const tampered = body.replace("2000", "1");
    expect(handleWebhook(context, { body: tampered, signature, timestamp: NOW }, NOW)).toBe(401);
  });
});

describe("billing#BW-INV-002", () => {
  it("rejects a webhook outside the replay window", () => {
    expect(send(paid(), { timestamp: NOW - 301 })).toBe(401);
    expect(hasProAccess(context.subscriptions, "c")).toBe(false);
  });
});

describe("billing#BW-INV-003", () => {
  it("applies a duplicate event only once", () => {
    send(paid());
    send({ amountCents: 500, customerId: "c", id: "e2", invoiceId: "i1", type: "payment.refunded" });
    send({ amountCents: 500, customerId: "c", id: "e2", invoiceId: "i1", type: "payment.refunded" });
    expect(context.invoices.get("i1")?.refundedCents).toBe(500);
  });
});

describe("billing#BW-INV-004", () => {
  it("never refunds more than was paid", () => {
    send(paid());
    send({ amountCents: 9000, customerId: "c", id: "e2", invoiceId: "i1", type: "payment.refunded" });
    expect(context.invoices.get("i1")?.refundedCents).toBe(2000);
  });
});
