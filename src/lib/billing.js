// ============================================================
// HiTasky — Google Play Billing abstraction layer.
//
// Wraps the IAP flow for the one-time Lifetime Pro purchase.
// Designed to degrade gracefully offline: the purchase state is
// always cached locally in AsyncStorage (via the store's
// `settings.purchased` flag), so Pro status persists forever
// without needing to re-validate against the Play Store.
//
// When you're ready to go live, install `react-native-iap` and
// uncomment the real implementation below the placeholders.
// ============================================================
import { PRO_PRODUCT_ID } from './config.js';

// ---- Connection state ----
let isConnected = false;

/**
 * Initialize the billing client. Call once on app start.
 * Non-blocking — failures are silently swallowed so the
 * offline-first core is never affected.
 */
export async function initBilling() {
  try {
    // TODO: Uncomment when react-native-iap is installed
    // const RNIap = require('react-native-iap');
    // await RNIap.initConnection();
    // isConnected = true;
    console.log('[Billing] Init — placeholder mode (no real IAP yet)');
    isConnected = true;
  } catch (e) {
    console.warn('[Billing] Init failed (offline?):', e.message);
    isConnected = false;
  }
}

/**
 * Fetch the product details for the Lifetime Pro SKU.
 * Returns { localizedPrice, title, description } or null.
 */
export async function getProProduct() {
  if (!isConnected) return null;
  try {
    // TODO: Uncomment when react-native-iap is installed
    // const RNIap = require('react-native-iap');
    // const products = await RNIap.getProducts({ skus: [PRO_PRODUCT_ID] });
    // return products[0] || null;
    return {
      productId: PRO_PRODUCT_ID,
      localizedPrice: '$19',
      title: 'HiTasky Lifetime Pro',
      description: 'Unlock everything. Forever.',
    };
  } catch (e) {
    console.warn('[Billing] getProProduct failed:', e.message);
    return null;
  }
}

/**
 * Trigger the purchase flow for the Lifetime Pro unlock.
 * Returns { success: true, purchasedAt: isoString } on success,
 * or { success: false, error: string } on failure/cancel.
 *
 * The caller is responsible for persisting `purchased: true` in
 * the store on success.
 */
export async function purchaseLifetimePro() {
  if (!isConnected) {
    return { success: false, error: 'Billing not connected. Check your internet connection.' };
  }
  try {
    // TODO: Uncomment when react-native-iap is installed
    // const RNIap = require('react-native-iap');
    // await RNIap.requestPurchase({ skus: [PRO_PRODUCT_ID] });
    // (The purchase listener in initBilling handles acknowledgement)

    // Placeholder: simulate a successful purchase
    console.log('[Billing] Purchase triggered — placeholder success');
    return { success: true, purchasedAt: new Date().toISOString() };
  } catch (e) {
    if (e.code === 'E_USER_CANCELLED') {
      return { success: false, error: 'cancelled' };
    }
    console.warn('[Billing] Purchase failed:', e.message);
    return { success: false, error: e.message || 'Purchase failed' };
  }
}

/**
 * Restore a previous purchase (e.g. after reinstall or new device).
 * Returns { success: true, purchasedAt } if a valid Pro purchase
 * is found, or { success: false } otherwise.
 */
export async function restorePurchase() {
  if (!isConnected) {
    return { success: false, error: 'Cannot reach Play Store. Check your internet connection.' };
  }
  try {
    // TODO: Uncomment when react-native-iap is installed
    // const RNIap = require('react-native-iap');
    // const purchases = await RNIap.getAvailablePurchases();
    // const pro = purchases.find(p => p.productId === PRO_PRODUCT_ID);
    // if (pro) {
    //   return { success: true, purchasedAt: pro.transactionDate };
    // }
    // return { success: false, error: 'No previous purchase found.' };

    // Placeholder: simulate no previous purchase
    console.log('[Billing] Restore triggered — placeholder');
    return { success: false, error: 'No previous purchase found.' };
  } catch (e) {
    console.warn('[Billing] Restore failed:', e.message);
    return { success: false, error: e.message || 'Restore failed' };
  }
}

/**
 * End the billing connection. Call on app unmount if needed.
 */
export async function endBilling() {
  try {
    // TODO: Uncomment when react-native-iap is installed
    // const RNIap = require('react-native-iap');
    // await RNIap.endConnection();
    isConnected = false;
  } catch (e) {
    // swallow
  }
}
