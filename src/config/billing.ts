// Clerk Billing slugs, so `has({ feature: FEATURES.x })` is checked by the
// compiler rather than spelled out at every call site. No secrets: safe to
// import from client components too.
//
// Each value must match the Feature's slug in the Clerk dashboard
// (Billing → Subscription plans) exactly. `has()` returns false for a slug
// that doesn't exist rather than throwing, so a typo there is a paywall that
// never unlocks.

export const FEATURES = {} as const satisfies Record<string, string>;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];
