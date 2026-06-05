// ============================================================
// "Founders' 40" early-access claim.
//
// On first launch we ask a tiny Apps Script endpoint for the next slot
// number. If it's within FOUNDER_LIMIT, this install is a lifetime
// founder (free Pro forever). The verdict is cached in AsyncStorage so
// it's decided exactly once and then works fully offline.
//
// Fail-safe: no URL / offline / any error → returns { founder:false,
// checked:false } so the caller can retry on a later launch and the
// user just stays on the normal trial in the meantime. We never grant
// founder status without a real server confirmation.
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { EARLY_ACCESS_URL, FOUNDER_LIMIT } from './config.js';

const CACHE_KEY = 'hitasky.founder.v1';

async function getInstallId() {
  try {
    const existing = await AsyncStorage.getItem('hitasky.installId');
    if (existing) return existing;
    const id = Crypto.randomUUID
      ? Crypto.randomUUID()
      : (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, String(Date.now() + Math.random()))).slice(0, 24);
    await AsyncStorage.setItem('hitasky.installId', id);
    return id;
  } catch (e) {
    return 'anon-' + Date.now();
  }
}

/**
 * Returns the cached founder verdict, or null if never resolved.
 * { founder: boolean, rank: number, checked: true }
 */
export async function getCachedFounder() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Claim (or return cached) founder status. Safe to call on every boot;
 * the network call only happens once (until a successful resolve is
 * cached). Returns { founder, rank, checked }.
 */
export async function claimFounderSlot() {
  // 1. Already resolved? Use the cache (offline-forever).
  const cached = await getCachedFounder();
  if (cached && cached.checked) return cached;

  // 2. No endpoint configured → cannot determine; stay on trial.
  if (!EARLY_ACCESS_URL) return { founder: false, rank: 0, checked: false };

  // 3. Ask the server for our slot (atomic increment server-side).
  try {
    const installId = await getInstallId();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(EARLY_ACCESS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installId, limit: FOUNDER_LIMIT }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const data = await res.json();
    // Expected: { rank: <number>, founder: <bool> }
    const verdict = {
      founder: !!data.founder,
      rank: Number(data.rank) || 0,
      checked: true,
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(verdict));
    return verdict;
  } catch (e) {
    // Network/parse failure → don't grant, allow retry next launch.
    return { founder: false, rank: 0, checked: false };
  }
}

/** Founders remaining (best-effort, for the "X left" UI nudge). */
export function foundersLeftLabel(rank) {
  if (!rank || rank <= 0) return null;
  const left = Math.max(0, FOUNDER_LIMIT - rank);
  return left > 0 ? `${left} free spots left` : null;
}
