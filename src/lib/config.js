// ============================================================
// App-wide configuration flags.
// ============================================================

// FREE PHASE — every premium feature is unlocked for everyone,
// ignoring even the trial clock.
//
// ⚠️ KEEP THIS `true` UNTIL BILLING IS LIVE. Flipping to `false`
// activates the 7-day trial → paywall. If you ship `false` BEFORE
// `react-native-iap` is installed and the Play product is approved,
// users hit the paywall after day 7 with NO way to pay = permanent
// lockout. Make flipping this to `false` the LAST step of release,
// only after you've test-purchased on an internal track.
//
// (To test the trial/paywall flow during development, flip locally.)
export const FREE_FOR_ALL = false;

// ---- 7-day no-card trial (Phase 1) ----
// Full Pro access for this many days from first launch, no card up
// front. After it lapses, the FOMO paywall gates premium features.
export const TRIAL_DAYS = 7;

// ---- Freemium tier limits (enforced when FREE_FOR_ALL === false) ----
export const FREE_LIMITS = {
  maxActiveTasks: 15,           // Active (uncompleted) tasks allowed
  maxLists: 3,                  // Custom lists allowed
  maxRecurringTasks: 3,         // Total recurring tasks allowed
  adCooldownMs: 90_000,         // 90s minimum between interstitial ads
  completionsPerInterstitial: 5, // Show interstitial every Nth completion
};

// Google Play Billing product ID for the lifetime Pro unlock.
// This must match the in-app product (one-time purchase) you create
// in the Play Console exactly.
export const PRO_PRODUCT_ID = 'hitasky_lifetime_pro';

// ---- Paywall pricing (Phase 1 — FOMO offer) ----
// The real, charged price comes from the Play Store at runtime
// (getProProduct().localizedPrice). These are display/fallback values.
//
// ⚠️ COMPLIANCE: only show `referencePrice` struck-through if it was a
// GENUINE prior/standard price. A fake "was $20" strikethrough that
// never existed is a reference-pricing violation (Google Play
// Misrepresentation policy + EU Omnibus / FTC) and can get the app
// removed. Leave `referencePrice` null for honest intro pricing.
export const PAYWALL_PRICING = {
  // Set to e.g. '$19.99' ONLY if that was a real selling price.
  referencePrice: null,
  // Fallback shown if the Play Store price can't be fetched (offline).
  saleFallback: '$4.99',
  // Honest framing for a launch discount.
  badge: 'Limited-time launch price',
};

// Master switch for ad display (separate from FREE_FOR_ALL so you
// can have a paid-only period before introducing ads).
export const ADS_ENABLED = false;

// ---- Offline-first guarantees ----
export const REQUIRES_INTERNET = false;      // Core app NEVER needs internet
export const BILLING_REQUIRES_INTERNET = true; // Only IAP needs network
