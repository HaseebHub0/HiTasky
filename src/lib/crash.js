// ============================================================
// HiTasky — Crashlytics wrapper (Phase 3.2).
//
// Firebase Crashlytics captures fatal JS crashes, native crashes and
// ANRs automatically once the native module is installed (requires an
// EAS dev/production build — NOT Expo Go). This wrapper:
//   • degrades to a console no-op when the module is absent, so the
//     same calls are safe in Expo Go and on web.
//   • installs a global JS error handler so uncaught errors are
//     recorded (and the default red-box / crash still proceeds).
//
// Crashlytics batches reports on-device and uploads on next launch
// with connectivity — i.e. it is offline-safe by design (Phase 3.3).
// ============================================================
let crashlytics = null;
try {
  crashlytics = require('@react-native-firebase/crashlytics').default;
} catch (_) {
  crashlytics = null;
}
const has = typeof crashlytics === 'function';

/** Call once at app boot. */
export function initCrashReporting() {
  if (!has) {
    console.log('[Crash] Crashlytics not present — no-op (Expo Go / web).');
    return;
  }
  try {
    crashlytics().setCrashlyticsCollectionEnabled(true);

    // Capture uncaught JS errors without swallowing the default handler.
    const g = global;
    if (g.ErrorUtils && typeof g.ErrorUtils.getGlobalHandler === 'function') {
      const prev = g.ErrorUtils.getGlobalHandler();
      g.ErrorUtils.setGlobalHandler((error, isFatal) => {
        try {
          crashlytics().recordError(error, isFatal ? 'fatal-js' : 'non-fatal-js');
        } catch (_) {}
        if (typeof prev === 'function') prev(error, isFatal);
      });
    }
  } catch (e) {
    console.warn('[Crash] init failed:', e && e.message);
  }
}

/** Record a handled (non-fatal) error. */
export function recordError(error, context) {
  if (!has) return;
  try {
    if (context) crashlytics().log(String(context));
    crashlytics().recordError(error instanceof Error ? error : new Error(String(error)));
  } catch (_) {}
}

/** Leave a breadcrumb in the next crash report. */
export function leaveBreadcrumb(message) {
  if (!has) return;
  try { crashlytics().log(String(message)); } catch (_) {}
}

export function crashReady() {
  return has;
}
