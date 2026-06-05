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
export const FREE_FOR_ALL = true;

// ---- 7-day no-card trial (Phase 1) ----
// Full Pro access for this many days from first launch, no card up
// front. After it lapses, the FOMO paywall gates premium features.
export const TRIAL_DAYS = 7;

// ---- "Founders' 40" early-access (first N installs free forever) ----
// The first FOUNDER_LIMIT people to open the app get lifetime Pro for
// free. Everyone after them gets the normal 7-day trial → $4.99 unlock.
//
// How it works: on first launch the app calls EARLY_ACCESS_URL (a tiny
// Google Apps Script web app) which ATOMICALLY hands out the next slot
// number and says whether it's within the first 40. The result is cached
// locally forever, so it keeps working offline after the one-time check.
//
// SAFE FALLBACK: if EARLY_ACCESS_URL is empty or the network fails, the
// user is simply NOT marked a founder (they fall to the normal trial).
// We never falsely grant Pro, and never lock anyone out.
export const FOUNDER_LIMIT = 40;
export const EARLY_ACCESS_URL = ''; // paste your Apps Script /exec URL

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
