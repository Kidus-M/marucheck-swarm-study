# Quota Service

A small TypeScript service that meters AI generations for a subscription product.

A client calls `handleGenerate` with a user id. The service looks up that user's stored subscription,
checks how many generations they have used this calendar month, and either allows the generation and
records it, or denies it with a reason.

Free accounts get a fixed monthly allowance. Pro accounts are unmetered. If a subscription is
canceled, the account falls back to the free allowance. Usage is counted per user per calendar month
in UTC, so it resets when the month changes.

## Layout

- `src/plans.ts`: plan tiers, limits, and how a subscription maps to a plan.
- `src/usage.ts`: the monthly usage store.
- `src/quota.ts`: the allow or deny decision.
- `src/api.ts`: the request handler that ties these together.
