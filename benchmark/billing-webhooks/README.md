# Billing Webhooks

A small TypeScript service that keeps subscription state in sync with a payment provider.

The provider posts signed webhook events. The service verifies the signature, ignores events it has
already processed, and applies each event to the customer's subscription and invoice records. Pro
access starts when a payment succeeds and stops when the subscription is canceled or a refund is
issued.

## Layout

- `src/signature.ts`: webhook signature checks.
- `src/events.ts`: event types and the record of processed events.
- `src/subscriptions.ts`: the subscription state machine.
- `src/invoices.ts`: invoice records and refunds.
- `src/webhook.ts`: the request handler that ties these together.
