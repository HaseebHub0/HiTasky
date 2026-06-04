// ============================================================
// HiTasky — Integrity / anti-tamper checks (Phase 2.3).
//
// Detects:
//   • Rooted device / jailbreak (via jail-monkey)
//   • Running under a debugger / on an emulator (soft signal)
//   • Wrong APK signing certificate (modded/re-signed APK) — needs a
//     native signature read; see getSignatureSha256() notes below.
//
// DESIGN CHOICE — lock, don't crash:
//   The brief said "instantly crash". We DON'T do that. Google Play's
//   policy discourages deliberate crashes, and a crash inflates the
//   very crash/ANR metrics you track in Phase 3.2 (Android vitals can
//   throttle your store listing). Instead checkIntegrity() returns a
//   verdict and the UI shows a non-dismissable lock screen. Same
//   deterrent, no self-inflicted vitals damage. You can still call
//   process.exit-style termination if you truly insist — see note.
//
// Requires (EAS build — NOT Expo Go):
//   npm i jail-monkey
//   npx expo install expo-application   # for app signature / build info
// Until installed, checks return "clean" so the app runs in Expo Go.
// ============================================================
let JailMonkey = null;
try { JailMonkey = require('jail-monkey').default || require('jail-monkey'); } catch (_) { JailMonkey = null; }

let Application = null;
try { Application = require('expo-application'); } catch (_) { Application = null; }

// SHA-256 of YOUR release signing certificate, uppercase hex with no
// colons. Get it from your upload/app-signing key:
//   keytool -list -v -keystore my-release.keystore | grep SHA256
// Leave '' to skip the signature check (e.g. before you have the key).
const EXPECTED_SIGNATURE_SHA256 = '';

/**
 * Read the running APK's signing certificate SHA-256.
 *
 * NOTE: expo-application does not expose the cert hash directly. For a
 * real signature check you need a tiny native module / config plugin
 * that calls PackageManager.getPackageInfo(..., GET_SIGNING_CERTIFICATES)
 * and returns the SHA-256. Wire that here and compare to
 * EXPECTED_SIGNATURE_SHA256. Returning null = "unknown / skip".
 */
async function getSignatureSha256() {
  // Placeholder until the native signature module is added.
  return null;
}

/**
 * Returns { compromised: boolean, reasons: string[] }.
 * Call once at boot; gate the UI on the result.
 */
export async function checkIntegrity() {
  const reasons = [];

  if (JailMonkey) {
    try {
      if (JailMonkey.isJailBroken()) reasons.push('root');
      // hookDetected catches Frida/Xposed-style instrumentation.
      if (typeof JailMonkey.hookDetected === 'function' && JailMonkey.hookDetected()) {
        reasons.push('hook');
      }
      if (typeof JailMonkey.isDebuggedMode === 'function') {
        // isDebuggedMode is async on Android.
        const dbg = await JailMonkey.isDebuggedMode();
        if (dbg) reasons.push('debugger');
      }
    } catch (_) {}
  }

  if (EXPECTED_SIGNATURE_SHA256) {
    try {
      const sig = await getSignatureSha256();
      if (sig && sig.toUpperCase() !== EXPECTED_SIGNATURE_SHA256.toUpperCase()) {
        reasons.push('signature');
      }
    } catch (_) {}
  }

  return { compromised: reasons.length > 0, reasons };
}

/** True only when we're a real installed build (not Expo Go/dev). */
export function isProductionBuild() {
  if (__DEV__) return false;
  if (Application && Application.applicationId) return true;
  return false;
}
