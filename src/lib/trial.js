// ============================================================
// HiTasky — 7-day no-card trial (Phase 1).
//
// Records an `installedAt` timestamp on first launch and grants
// full Pro access for TRIAL_DAYS days. After that, the store
// stops presenting `purchased: true` and the FOMO paywall fires.
//
// SECURITY — honest scope:
//   • Trial metadata is stored in expo-secure-store, which on
//     Android is backed by the Android Keystore + EncryptedShared-
//     Preferences. So it is encrypted at rest and survives normal
//     app restarts.
//   • It is signed with a per-install secret (SHA-256 checksum via
//     expo-crypto) so a rooted user editing the secure value is
//     detected → we treat tampering as "trial over".
//   • It DOES rollback-detection: if the wall clock moves backward
//     versus the last value we saw, we flag time-tampering and lock
//     the trial. (See Phase 4 — there is no server time here.)
//
//   ⚠️ It CANNOT survive uninstall or "Clear app data". The OS wipes
//   the app sandbox AND the Keystore keys on uninstall — no on-device
//   store can defeat that. Stopping reinstall-resets needs a backend
//   (account-tied) which would break the offline-first promise.
//   Do not advertise this trial as "tamper-proof".
//
// Cross-platform: SecureStore/Crypto are native-only. On web (and if
// the modules are missing in Expo Go) we fall back to AsyncStorage
// with no encryption — fine, since web is not the paid surface.
// ============================================================
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRIAL_DAYS } from './config.js';

const SECURE_KEY = 'hitasky.entitlement.v1';
const SECRET_KEY = 'hitasky.entitlement.secret.v1';
const DAY_MS = 24 * 60 * 60 * 1000;
// Tolerance for benign clock jitter / timezone shifts before we call
// a backwards jump "tampering" (6h).
const ROLLBACK_TOLERANCE_MS = 6 * 60 * 60 * 1000;

// ---- Lazy native module loading (graceful on web / Expo Go) ----
let SecureStore = null;
let Crypto = null;
try { SecureStore = require('expo-secure-store'); } catch (_) {}
try { Crypto = require('expo-crypto'); } catch (_) {}
const hasSecure = !!(SecureStore && Platform.OS !== 'web');

async function secureGet(key) {
  if (hasSecure) {
    try { return await SecureStore.getItemAsync(key); } catch (_) { return null; }
  }
  try { return await AsyncStorage.getItem(key); } catch (_) { return null; }
}
async function secureSet(key, value) {
  if (hasSecure) {
    try { await SecureStore.setItemAsync(key, value); return; } catch (_) {}
  }
  try { await AsyncStorage.setItem(key, value); } catch (_) {}
}

// ---- Integrity: per-install random secret + SHA-256 checksum ----
async function getSecret() {
  let s = await secureGet(SECRET_KEY);
  if (!s) {
    s = (Crypto && Crypto.randomUUID)
      ? Crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    await secureSet(SECRET_KEY, s);
  }
  return s;
}

async function sign(payloadStr, secret) {
  if (Crypto && Crypto.digestStringAsync) {
    try {
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${payloadStr}::${secret}`
      );
    } catch (_) {}
  }
  // Fallback non-crypto checksum (web / missing module). Weak by design.
  let h = 0;
  const str = `${payloadStr}::${secret}`;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return `f${h}`;
}

async function readRecord() {
  const raw = await secureGet(SECURE_KEY);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj.installedAt !== 'number' || !obj.sig) return null;
    const secret = await getSecret();
    const expected = await sign(payloadOf(obj), secret);
    if (expected !== obj.sig) {
      // Signature mismatch → someone edited the stored value.
      return { ...obj, tampered: true };
    }
    return obj;
  } catch (_) {
    return null;
  }
}

function payloadOf(obj) {
  // Only the protected fields are signed (stable key order).
  return JSON.stringify({
    installedAt: obj.installedAt,
    lastSeen: obj.lastSeen,
    tamperedAt: obj.tamperedAt || null,
  });
}

async function writeRecord(obj) {
  const secret = await getSecret();
  const sig = await sign(payloadOf(obj), secret);
  await secureSet(SECURE_KEY, JSON.stringify({ ...obj, sig }));
}

/**
 * Call once early in app boot (before first entitlement read).
 * Records install time on first launch and runs rollback detection.
 *
 * Returns the resolved entitlement snapshot (see getTrialStatus()).
 */
export async function initTrial() {
  const now = Date.now();
  let rec = await readRecord();

  // First ever launch → start the trial.
  if (!rec) {
    rec = { installedAt: now, lastSeen: now, tamperedAt: null };
    await writeRecord(rec);
    return { ...statusFrom(rec, now), justStarted: true };
  }

  // Tamper detected via signature → lock permanently.
  if (rec.tampered && !rec.tamperedAt) {
    rec = { ...rec, tamperedAt: now };
    await writeRecord(rec);
  }

  // Rollback detection: wall clock moved backwards vs. last seen.
  // (Catches "change device date to the past to extend the trial".)
  if (typeof rec.lastSeen === 'number' && now < rec.lastSeen - ROLLBACK_TOLERANCE_MS) {
    rec = { ...rec, tamperedAt: rec.tamperedAt || now };
  }

  // Advance the high-water mark (never let it go backwards).
  const lastSeen = Math.max(rec.lastSeen || 0, now);
  rec = { ...rec, lastSeen };
  await writeRecord(rec);

  return statusFrom(rec, now);
}

function statusFrom(rec, now = Date.now()) {
  if (!rec) {
    return { trialActive: false, daysLeft: 0, expired: true, tampered: false, installedAt: null };
  }
  const tampered = !!(rec.tampered || rec.tamperedAt);
  const elapsed = now - rec.installedAt;
  const remainingMs = TRIAL_DAYS * DAY_MS - elapsed;
  // A high-water clock that's way ahead of `now` also means tampering,
  // but we still honor "expired" if the legit elapsed time is up.
  const expiredByTime = remainingMs <= 0;
  const trialActive = !tampered && !expiredByTime;
  return {
    trialActive,
    expired: !trialActive,
    tampered,
    daysLeft: trialActive ? Math.max(1, Math.ceil(remainingMs / DAY_MS)) : 0,
    installedAt: rec.installedAt,
  };
}

/** Read current status without mutating (cheap; safe to call often). */
export async function getTrialStatus() {
  const rec = await readRecord();
  return statusFrom(rec);
}
