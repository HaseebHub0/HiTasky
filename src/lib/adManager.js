// ============================================================
// HiTasky — Ad Manager with strict UX guardrails.
//
// Provides banner + interstitial ad control. Key principle:
// ads must NEVER degrade the core experience. Specifically:
//   • No ad immediately after completing or editing a task
//   • 90-second global cooldown between interstitials
//   • Only after N completions (not on every action)
//   • Pro users never see any ads, ever
//
// Uses placeholder components until react-native-google-mobile-ads
// is installed (requires EAS dev client).
// ============================================================
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FREE_LIMITS, ADS_ENABLED } from './config.js';
import { FONT } from '../theme.js';

// ---- Interstitial state (module-level singleton) ----
let lastAdShownAt = 0;
let completionsSinceAd = 0;

/**
 * Record a task completion and check if an interstitial should fire.
 * Returns true if an interstitial should be shown NOW.
 *
 * Guardrails:
 *  1. ADS_ENABLED must be true
 *  2. isProUser must be false
 *  3. At least `completionsPerInterstitial` completions since last ad
 *  4. At least `adCooldownMs` since last ad
 */
export function recordCompletionForAd(isProUser) {
  if (!ADS_ENABLED || isProUser) return false;

  completionsSinceAd++;

  const now = Date.now();
  const cooldownMet = (now - lastAdShownAt) >= FREE_LIMITS.adCooldownMs;
  const thresholdMet = completionsSinceAd >= FREE_LIMITS.completionsPerInterstitial;

  if (cooldownMet && thresholdMet) {
    return true; // caller should show interstitial
  }
  return false;
}

/**
 * Mark that an interstitial was just shown. Resets the counter.
 */
export function markAdShown() {
  lastAdShownAt = Date.now();
  completionsSinceAd = 0;
}

/**
 * Check if enough time has passed since the last ad.
 * Used as an extra guard before showing any interstitial.
 */
export function isCooldownMet() {
  return (Date.now() - lastAdShownAt) >= FREE_LIMITS.adCooldownMs;
}

/**
 * Show an interstitial ad. Placeholder — does nothing until
 * react-native-google-mobile-ads is wired in.
 */
export async function showInterstitial() {
  if (!ADS_ENABLED) return;

  try {
    // TODO: Uncomment when react-native-google-mobile-ads is installed
    // const { InterstitialAd, AdEventType, TestIds } = require('react-native-google-mobile-ads');
    // const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-XXXX/YYYY';
    // const interstitial = InterstitialAd.createForAdRequest(adUnitId);
    // interstitial.addAdEventListener(AdEventType.LOADED, () => interstitial.show());
    // interstitial.load();

    console.log('[AdManager] Interstitial would show here (placeholder)');
    markAdShown();
  } catch (e) {
    console.warn('[AdManager] Interstitial failed:', e.message);
  }
}

// ============================================================
// AdBanner — placeholder banner component for free-tier users.
// Rendered at the bottom of screen content, above the BottomNav.
// ============================================================
export function AdBanner({ isProUser, theme }) {
  // Never render for Pro users or when ads are disabled
  if (isProUser || !ADS_ENABLED) return null;

  // TODO: Replace with real AdMob BannerAd when ready:
  // const { BannerAd, BannerAdSize, TestIds } = require('react-native-google-mobile-ads');
  // return (
  //   <BannerAd
  //     unitId={__DEV__ ? TestIds.BANNER : 'ca-app-pub-XXXX/ZZZZ'}
  //     size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
  //   />
  // );

  return (
    <View style={[styles.bannerPlaceholder, { backgroundColor: theme.surface, borderColor: theme.hairline2 }]}>
      <Text style={[styles.bannerText, { color: theme.text4 }]}>
        Ad space — upgrade to remove
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerPlaceholder: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
  },
  bannerText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
