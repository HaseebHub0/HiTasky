// ============================================================
// App-wide configuration flags.
// ============================================================

// FREE PHASE — every premium feature is unlocked for everyone.
// We keep all the paywall code in place but dormant. When you're
// ready to charge (e.g. after 50+ Play Store installs), flip this
// to `false` and wire real in-app billing into the paywall.
export const FREE_FOR_ALL = true;

// ---- Freemium tier limits (enforced when FREE_FOR_ALL === false) ----
export const FREE_LIMITS = {
  maxActiveTasks: 15,           // Active (uncompleted) tasks allowed
  maxLists: 3,                  // Custom lists allowed
  maxRecurringTasks: 3,         // Total recurring tasks allowed
  adCooldownMs: 90_000,         // 90s minimum between interstitial ads
  completionsPerInterstitial: 5, // Show interstitial every Nth completion
};

// Google Play Billing product ID for the lifetime Pro unlock.
export const PRO_PRODUCT_ID = 'hitasky_lifetime_pro';

// Master switch for ad display (separate from FREE_FOR_ALL so you
// can have a paid-only period before introducing ads).
export const ADS_ENABLED = false;

// ---- Offline-first guarantees ----
export const REQUIRES_INTERNET = false;      // Core app NEVER needs internet
export const BILLING_REQUIRES_INTERNET = true; // Only IAP needs network
