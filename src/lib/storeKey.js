// ============================================================
// HiTasky — AES-256 storage key manager (Phase 2.2).
//
// The key is generated once using crypto-quality randomness from
// expo-crypto (backed by the OS CSPRNG). It is stored in
// expo-secure-store which on Android uses EncryptedSharedPreferences
// + Android Keystore — meaning the raw bytes are never accessible
// without the user's lock-screen credential.
//
// getStoreKey() is called once per boot (inside loadState, before the
// first read). Subsequent encrypt/decrypt calls in the same session
// use the in-memory Uint8Array — no SecureStore round-trips per save.
//
// Fallback chain (so the app never crashes in Expo Go / web):
//   1. expo-secure-store + expo-crypto  →  real encrypted key
//   2. AsyncStorage + expo-crypto        →  unencrypted key storage
//      (same key bytes, just stored without Keystore backing)
//   3. Deterministic dev key             →  development-only, logged
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SECURE_KEY_NAME = 'hitasky.store.aes256key.v1';
const FALLBACK_KEY_NAME = 'hitasky.store.aes256key.fallback.v1';

let SecureStore = null;
let Crypto = null;
try { SecureStore = require('expo-secure-store'); } catch (_) {}
try { Crypto = require('expo-crypto'); } catch (_) {}

const hasSecure = !!(SecureStore && Platform.OS !== 'web');

// In-memory cache so we only hit SecureStore once per session.
let _cachedKey = null;

function hexToKey(hex) {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function generateKeyHex() {
  if (Crypto && Crypto.getRandomBytes) {
    const bytes = Crypto.getRandomBytes(32);
    let hex = '';
    for (let i = 0; i < 32; i++) hex += bytes[i].toString(16).padStart(2, '0');
    return hex;
  }
  // Math.random fallback (Expo Go without native module).
  // The resulting key is weak — acceptable only in dev/web since
  // SecureStore is also unavailable there.
  let hex = '';
  for (let i = 0; i < 32; i++) hex += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  return hex;
}

async function readKeyHex() {
  if (hasSecure) {
    try { return await SecureStore.getItemAsync(SECURE_KEY_NAME); } catch (_) {}
  }
  try { return await AsyncStorage.getItem(FALLBACK_KEY_NAME); } catch (_) { return null; }
}

async function writeKeyHex(hex) {
  if (hasSecure) {
    try { await SecureStore.setItemAsync(SECURE_KEY_NAME, hex); return; } catch (_) {}
  }
  try { await AsyncStorage.setItem(FALLBACK_KEY_NAME, hex); } catch (_) {}
}

/**
 * Returns a Uint8Array[32] AES key, generating and persisting it on
 * first call. Subsequent calls return the in-memory cached copy.
 * Never throws — worst case returns a fixed dev key and logs a warning.
 */
export async function getStoreKey() {
  if (_cachedKey) return _cachedKey;

  try {
    let hex = await readKeyHex();
    if (!hex || hex.length !== 64) {
      hex = generateKeyHex();
      await writeKeyHex(hex);
    }
    _cachedKey = hexToKey(hex);
    return _cachedKey;
  } catch (e) {
    console.warn('[StoreKey] Key management failed, using dev fallback:', e.message);
    // Deterministic fallback — every device gets the same "key",
    // so there is effectively no encryption. Only happens if both
    // SecureStore and AsyncStorage are unavailable (web CI / tests).
    _cachedKey = hexToKey('deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
    return _cachedKey;
  }
}

/** For testing only — clears the in-memory cache so the next
 *  getStoreKey() re-reads from SecureStore. */
export function _resetKeyCache() {
  _cachedKey = null;
}
