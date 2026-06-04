// ============================================================
// HiTasky — Analytics + offline batching (Phase 3).
//
// One funnel: track(event, params). Conversion + engagement events
// flow through here so the call sites stay clean.
//
// Offline-first behaviour:
//   • If @react-native-firebase/analytics is installed (requires an
//     EAS dev/production build — NOT Expo Go), we forward to it.
//     Firebase already persists events on-device and dispatches them
//     in batches when connectivity returns, so offline is handled.
//   • If the native module is absent (Expo Go / web / before you wire
//     Firebase), we buffer events durably in AsyncStorage so nothing
//     is lost, and flush them to Firebase the moment it appears.
//
// Crashlytics: see crash.js. Keeping crash + analytics separate keeps
// each surface swappable.
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'hitasky.analytics.queue.v1';
const MAX_QUEUE = 500; // hard cap so a long offline stretch can't bloat storage

// Allowed event names — keeps the funnel typo-free and documents the
// KPIs we actually care about (Phase 3.1).
export const EVENTS = {
  trial_started: 'trial_started',
  paywall_viewed: 'paywall_viewed',
  purchase_attempted: 'purchase_attempted',
  purchase_success: 'purchase_success',
  purchase_failed: 'purchase_failed',
  purchase_restored: 'purchase_restored',
  task_completed: 'task_completed',
};

let firebase = null;
try {
  // Default export is a function returning the analytics instance.
  firebase = require('@react-native-firebase/analytics').default;
} catch (_) {
  firebase = null;
}
const hasFirebase = typeof firebase === 'function';

let memQueue = [];
let loaded = false;
let flushing = false;

async function loadQueue() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    memQueue = raw ? JSON.parse(raw) : [];
  } catch (_) {
    memQueue = [];
  }
}

async function persistQueue() {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(memQueue.slice(-MAX_QUEUE)));
  } catch (_) {}
}

// Firebase event names must be <=40 chars, snake_case; param values
// must be string/number/boolean. Coerce defensively.
function sanitizeParams(params = {}) {
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    const key = String(k).slice(0, 40);
    out[key] = typeof v === 'object' ? JSON.stringify(v).slice(0, 100) : v;
  }
  return out;
}

async function sendOne(evt) {
  if (!hasFirebase) throw new Error('no-sink');
  await firebase().logEvent(evt.event, sanitizeParams(evt.params));
}

/**
 * Track an event. Fire-and-forget — never throws into the caller and
 * never blocks the UI. Safe to call from anywhere (reducers excluded —
 * keep side effects out of the reducer).
 */
export function track(event, params = {}) {
  // Don't await — analytics must never delay user interactions.
  (async () => {
    await loadQueue();
    const evt = { event, params, ts: Date.now() };

    if (hasFirebase) {
      try {
        await sendOne(evt);
        return; // Firebase owns offline batching from here.
      } catch (_) {
        // fall through to local buffering
      }
    }
    memQueue.push(evt);
    await persistQueue();
  })();
}

/**
 * Flush the local fallback buffer to Firebase. Call on app foreground
 * / connectivity regain. No-op when there's no sink or nothing queued.
 */
export async function flushAnalytics() {
  if (!hasFirebase || flushing) return;
  await loadQueue();
  if (memQueue.length === 0) return;
  flushing = true;
  try {
    const pending = [...memQueue];
    const sent = [];
    for (const evt of pending) {
      try {
        await sendOne(evt);
        sent.push(evt);
      } catch (_) {
        break; // still offline / sink failing — stop, keep the rest
      }
    }
    if (sent.length) {
      memQueue = memQueue.slice(sent.length);
      await persistQueue();
    }
  } finally {
    flushing = false;
  }
}

/** Whether a real analytics sink is wired (for diagnostics/Settings). */
export function analyticsReady() {
  return hasFirebase;
}
