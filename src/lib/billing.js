// ============================================================
// HiTasky — Google Play Billing (Phases 1 & 2).
//
// One-time purchase: PRO_PRODUCT_ID ("Lifetime Pro").
//
// SECURITY (Phase 2.1) — anti-spoofing:
//   Every purchase returned by Play carries a `signature` (RSA-SHA1,
//   signed with Google's private key) over the `transactionReceipt`
//   JSON. We verify that signature locally against the app's base64
//   RSA *public* key from the Play Console (Monetisation setup →
//   Licensing). A tampered/faked purchase from Lucky Patcher won't
//   have a valid Google signature, so verification fails and Pro is
//   NOT granted.
//
//   ⚠️ Local verification raises the bar but is not unbeatable on a
//   rooted device (the public key / check can be patched out — that's
//   what Phase 2.3 integrity checks + R8 obfuscation are for). The
//   only authoritative check is server-side validation via the Play
//   Developer API. Add that when you have a backend.
//
// Offline behaviour: once verified, the caller persists `purchased`
// in the encrypted store, so Pro survives forever with no re-check.
//
// Requires (install for an EAS build — NOT Expo Go):
//   npx expo install react-native-iap
//   npm i jsrsasign            # pure-JS RSA verify
// Until installed, every method degrades to a safe "not available".
// ============================================================
import { PRO_PRODUCT_ID } from './config.js';

// Base64 RSA public key from Play Console → Monetisation → Licensing.
// Paste the long base64 string here before your production build.
const PLAY_PUBLIC_KEY_BASE64 = '';

let RNIap = null;
try { RNIap = require('react-native-iap'); } catch (_) { RNIap = null; }
const hasIap = !!RNIap;

let isConnected = false;
let purchaseUpdateSub = null;
let purchaseErrorSub = null;

// Resolver bridge: requestPurchase resolves via the purchaseUpdated
// listener (the correct RN-IAP pattern), not from requestPurchase().
let pendingResolve = null;

/**
 * Verify a purchase's Google signature locally (RSA-SHA1 over the
 * receipt JSON). Returns true only if the signature is valid against
 * our Play public key. Fails CLOSED on any error.
 */
function verifyPurchaseSignature(purchase) {
  try {
    const data = purchase && (purchase.transactionReceipt || purchase.originalJson);
    const signature = purchase && purchase.signatureAndroid;
    if (!data || !signature) return false;
    if (!PLAY_PUBLIC_KEY_BASE64) {
      // No key configured → cannot verify → refuse (fail closed).
      console.warn('[Billing] PLAY_PUBLIC_KEY_BASE64 not set — refusing unverified purchase.');
      return false;
    }
    // jsrsasign verifies RSA-SHA1 over the exact receipt bytes.
    const { KEYUTIL, KJUR, b64tohex } = require('jsrsasign');
    const pubPem =
      '-----BEGIN PUBLIC KEY-----\n' +
      PLAY_PUBLIC_KEY_BASE64.replace(/(.{64})/g, '$1\n') +
      '\n-----END PUBLIC KEY-----';
    const pubKey = KEYUTIL.getKey(pubPem);
    const sig = new KJUR.crypto.Signature({ alg: 'SHA1withRSA' });
    sig.init(pubKey);
    sig.updateString(data);
    // Play signature is base64; jsrsasign verifies hex (no Node Buffer in RN).
    return sig.verify(b64tohex(signature));
  } catch (e) {
    console.warn('[Billing] Signature verify error (failing closed):', e && e.message);
    return false;
  }
}

export async function initBilling() {
  if (!hasIap) {
    console.log('[Billing] react-native-iap not installed — billing disabled (Expo Go).');
    return;
  }
  try {
    await RNIap.initConnection();
    isConnected = true;

    purchaseUpdateSub = RNIap.purchaseUpdatedListener(async (purchase) => {
      try {
        if (purchase.productId !== PRO_PRODUCT_ID) return;

        // 1. Verify signature BEFORE granting anything.
        if (!verifyPurchaseSignature(purchase)) {
          if (pendingResolve) {
            pendingResolve({ success: false, error: 'Purchase could not be verified.' });
            pendingResolve = null;
          }
          return;
        }

        // 2. Acknowledge / finish (required within 3 days or Play refunds).
        await RNIap.finishTransaction({ purchase, isConsumable: false });

        if (pendingResolve) {
          pendingResolve({
            success: true,
            purchasedAt: new Date(purchase.transactionDate || Date.now()).toISOString(),
          });
          pendingResolve = null;
        }
      } catch (e) {
        if (pendingResolve) {
          pendingResolve({ success: false, error: e.message || 'Purchase processing failed' });
          pendingResolve = null;
        }
      }
    });

    purchaseErrorSub = RNIap.purchaseErrorListener((err) => {
      if (pendingResolve) {
        const cancelled = err && (err.code === 'E_USER_CANCELLED');
        pendingResolve({ success: false, error: cancelled ? 'cancelled' : (err && err.message) || 'Purchase failed' });
        pendingResolve = null;
      }
    });
  } catch (e) {
    console.warn('[Billing] Init failed (offline?):', e.message);
    isConnected = false;
  }
}

export async function getProProduct() {
  if (!hasIap || !isConnected) return null;
  try {
    const products = await RNIap.getProducts({ skus: [PRO_PRODUCT_ID] });
    const p = products && products[0];
    if (!p) return null;
    return {
      productId: p.productId,
      localizedPrice: p.localizedPrice, // already formatted in user's currency
      title: p.title,
      description: p.description,
    };
  } catch (e) {
    console.warn('[Billing] getProProduct failed:', e.message);
    return null;
  }
}

export async function purchaseLifetimePro() {
  if (!hasIap || !isConnected) {
    return { success: false, error: 'Billing not available. Check your internet connection.' };
  }
  try {
    // The result is delivered by purchaseUpdatedListener / errorListener.
    const result = new Promise((resolve) => { pendingResolve = resolve; });
    await RNIap.requestPurchase({ skus: [PRO_PRODUCT_ID] });
    return await result;
  } catch (e) {
    if (e.code === 'E_USER_CANCELLED') return { success: false, error: 'cancelled' };
    pendingResolve = null;
    return { success: false, error: e.message || 'Purchase failed' };
  }
}

export async function restorePurchase() {
  if (!hasIap || !isConnected) {
    return { success: false, error: 'Cannot reach Play Store. Check your internet connection.' };
  }
  try {
    const purchases = await RNIap.getAvailablePurchases();
    const pro = (purchases || []).find((p) => p.productId === PRO_PRODUCT_ID);
    if (!pro) return { success: false, error: 'No previous purchase found.' };
    // Re-verify on restore too — never trust an unsigned receipt.
    if (!verifyPurchaseSignature(pro)) {
      return { success: false, error: 'Existing purchase could not be verified.' };
    }
    return { success: true, purchasedAt: new Date(pro.transactionDate || Date.now()).toISOString() };
  } catch (e) {
    console.warn('[Billing] Restore failed:', e.message);
    return { success: false, error: e.message || 'Restore failed' };
  }
}

export async function endBilling() {
  try {
    if (purchaseUpdateSub) purchaseUpdateSub.remove();
    if (purchaseErrorSub) purchaseErrorSub.remove();
    if (hasIap && isConnected) await RNIap.endConnection();
  } catch (_) {}
  isConnected = false;
}
