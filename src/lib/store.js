// ============================================================
// HiTasky (mobile) — offline-first store.
// Same single-source-of-truth model as the web app, persisted to
// AsyncStorage. No network, ever. Backup/restore goes through the
// system share sheet & document picker (SAF analogue).
//
// Reliability features (Competitor Fix #4 — Data Security):
//   • Debounced writes — batches rapid changes (500ms)
//   • Atomic persistence — write-to-temp then swap
//   • State validation on hydrate — deduplication, orphan cleanup
//   • Reminder rescheduling on boot & import (Fix #1)
// ============================================================
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { LayoutAnimation } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { uid } from './id.js';
import { startOfDay, startOfWeek, isWeekday } from './date.js';
import { ACCENTS } from '../theme.js';
import { scheduleReminder, cancelReminder, rescheduleAllReminders, scheduleMorningDigest } from './notifications.js';
import { FREE_FOR_ALL } from './config.js';
import { initTrial } from './trial.js';
import { claimFounderSlot } from './earlyAccess.js';
import { track } from './analytics.js';
import { getStoreKey } from './storeKey.js';
import { encryptString, decryptString } from './aes.js';
import { updateTodayWidget } from '../widget/updateWidget.js';

const KEY = 'hitasky.v1';
const KEY_PENDING = 'hitasky.v1.pending';
const SCHEMA = 1;
const PERSIST_DEBOUNCE_MS = 500;

function nowIso() {
  return new Date().toISOString();
}

/* ---- seed content for a first run — a clean, empty slate.
   New installs start with no tasks, lists, or notes. The onboarding
   flow lets the user create their very first list + task. ---- */
function seed() {
  return {
    schema: SCHEMA,
    lists: [],
    tasks: [],
    notes: [],
    settings: {
      theme: 'dark',
      haptics: true,
      inkStrike: true,
      animations: true,
      sound: false,
      onboarded: false,
      purchased: false,
      purchasedAt: null,
      accent: null,
      pet: 'zen',
      fontStyle: 'poppins',
      sortBy: 'smart',
      streak: 0,
      streakLastDate: null,
    },
  };
}

/* ============================================================
   Validation — ensures state integrity on every hydrate / import.
   Fixes: duplicate IDs, orphaned listId refs, inconsistent
   completion state, sortOrder gaps.
   ============================================================ */
function validateState(state) {
  if (!state) return seed();

  let modified = false;
  const listIds = new Set((state.lists || []).map((l) => l.id));

  if (!state.notes) {
    state.notes = [];
    modified = true;
  }

  // Deduplicate tasks by ID (keep the most recent version)
  const taskById = new Map();
  for (const t of state.tasks || []) {
    const existing = taskById.get(t.id);
    if (!existing || (t.createdAt && (!existing.createdAt || t.createdAt > existing.createdAt))) {
      taskById.set(t.id, t);
    } else {
      modified = true; // found a duplicate
    }
  }

  let tasks = Array.from(taskById.values()).map((t) => {
    let patched = t;

    // Fix orphaned listId references → move to Inbox
    if (t.listId && !listIds.has(t.listId)) {
      patched = { ...patched, listId: null };
      modified = true;
    }

    // Fix inconsistent completion state
    if (t.isCompleted && !t.completedAt) {
      patched = { ...patched, completedAt: nowIso() };
      modified = true;
    }
    if (!t.isCompleted && t.completedAt) {
      patched = { ...patched, completedAt: null };
      modified = true;
    }

    return patched;
  });

  // Filter out any generated performance mock tasks
  const originalCount = tasks.length;
  tasks = tasks.filter((t) => !t.title.includes('(Mock'));
  if (tasks.length !== originalCount) {
    modified = true;
  }

  // Normalize sortOrder — re-index to remove gaps
  const active = tasks.filter((t) => !t.isCompleted).sort((a, b) => a.sortOrder - b.sortOrder);
  active.forEach((t, i) => {
    if (t.sortOrder !== i) {
      t.sortOrder = i;
      modified = true;
    }
  });

  // Deduplicate lists by ID
  const seenListIds = new Set();
  const lists = (state.lists || []).filter((l) => {
    if (seenListIds.has(l.id)) {
      modified = true;
      return false;
    }
    seenListIds.add(l.id);
    return true;
  });

  if (modified) {
    return { ...state, tasks, lists, notes: state.notes || [] };
  }
  return state;
}

function migrate(data) {
  const base = seed();
  const merged = {
    ...base,
    ...data,
    schema: SCHEMA,
    settings: { ...base.settings, ...(data.settings || {}) },
    lists: (Array.isArray(data.lists) ? data.lists : base.lists).map((l) => ({
      icon: 'list',
      ...l,
    })),
    tasks: (Array.isArray(data.tasks) ? data.tasks : base.tasks).map((t) => ({
      recurring: null,
      priority: 'medium',
      startAt: null,
      ...t,
    })),
    notes: Array.isArray(data.notes) ? data.notes : [],
  };
  return validateState(merged);
}

function getLocalDateString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function checkAndResetStreak(settings) {
  if (!settings) return settings;
  const streak = settings.streak || 0;
  const lastDate = settings.streakLastDate; // "YYYY-MM-DD" local time
  if (streak > 0 && lastDate) {
    const today = getLocalDateString();
    const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
    if (lastDate !== today && lastDate !== yesterday) {
      return {
        ...settings,
        streak: 0,
      };
    }
  }
  return settings;
}

function incrementStreak(settings) {
  const today = getLocalDateString();
  const currentStreak = settings?.streak || 0;
  const lastDate = settings?.streakLastDate;

  if (lastDate === today) {
    return settings; // Already completed a task today
  }

  const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
  let newStreak = 1;
  if (lastDate === yesterday) {
    newStreak = currentStreak + 1;
  }

  return {
    ...settings,
    streak: newStreak,
    streakLastDate: today,
  };
}

/* ============================================================
   reducer (identical logic to web)
   ============================================================ */
function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE': {
      const hydrated = action.payload;
      if (hydrated && hydrated.settings) {
        hydrated.settings = checkAndResetStreak(hydrated.settings);
      }
      return hydrated;
    }

    case 'ADD_TASK': {
      const { title, note, listId, dueAt, startAt, reminderAt, recurring, priority } = action.payload;
      if (!title || !title.trim()) return state;
      const minOrder = Math.min(0, ...state.tasks.map((t) => t.sortOrder)) - 1;
      const task = {
        id: uid('t'),
        title: title.trim(),
        note: (note || '').trim(),
        listId: listId || null,
        dueAt: dueAt || null,
        startAt: startAt || null,
        reminderAt: reminderAt || null,
        recurring: recurring || null,
        priority: priority || 'medium',
        isCompleted: false,
        completedAt: null,
        sortOrder: minOrder,
        createdAt: nowIso(),
      };
      return { ...state, tasks: [task, ...state.tasks] };
    }

    case 'UPDATE_TASK': {
      const { id, patch } = action.payload;
      const oldTask = state.tasks.find((t) => t.id === id);
      const newTasks = state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
      let newSettings = state.settings;
      if (patch.isCompleted && (!oldTask || !oldTask.isCompleted)) {
        newSettings = incrementStreak(state.settings);
      }
      return {
        ...state,
        tasks: newTasks,
        settings: newSettings,
      };
    }

    case 'TOGGLE_TASK': {
      const { id, value } = action.payload;
      const newTasks = state.tasks.map((t) =>
        t.id === id ? { ...t, isCompleted: value, completedAt: value ? nowIso() : null } : t
      );
      let newSettings = state.settings;
      if (value) {
        newSettings = incrementStreak(state.settings);
      }
      return {
        ...state,
        tasks: newTasks,
        settings: newSettings,
      };
    }

    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload.id) };

    case 'RESTORE_TASK': {
      const { task } = action.payload;
      if (!task) return state;
      return { ...state, tasks: [task, ...state.tasks] };
    }

    case 'REORDER': {
      const { orderedIds } = action.payload;
      const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
      return {
        ...state,
        tasks: state.tasks.map((t) => (orderMap.has(t.id) ? { ...t, sortOrder: orderMap.get(t.id) } : t)),
      };
    }

    case 'ADD_LIST': {
      const { name, accent, icon } = action.payload;
      if (!name || !name.trim()) return state;
      const maxOrder = Math.max(-1, ...state.lists.map((l) => l.sortOrder)) + 1;
      const list = {
        id: uid('l'),
        name: name.trim(),
        accent: accent || ACCENTS[state.lists.length % ACCENTS.length],
        icon: icon || 'list',
        sortOrder: maxOrder,
        createdAt: nowIso(),
      };
      return { ...state, lists: [...state.lists, list] };
    }

    case 'UPDATE_LIST':
      return {
        ...state,
        lists: state.lists.map((l) => (l.id === action.payload.id ? { ...l, ...action.payload.patch } : l)),
      };

    case 'DELETE_LIST': {
      const { id } = action.payload;
      return {
        ...state,
        lists: state.lists.filter((l) => l.id !== id),
        tasks: state.tasks.map((t) => (t.listId === id ? { ...t, listId: null } : t)),
      };
    }

    case 'ADD_NOTE': {
      const { title, content, accent } = action.payload;
      const note = {
        id: uid('n'),
        title: (title || '').trim(),
        content: (content || '').trim(),
        accent: accent || ACCENTS[0],
        pinned: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      return { ...state, notes: [note, ...(state.notes || [])] };
    }

    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: (state.notes || []).map((n) =>
          n.id === action.payload.id ? { ...n, ...action.payload.patch, updatedAt: nowIso() } : n
        ),
      };

    case 'DELETE_NOTE':
      return {
        ...state,
        notes: (state.notes || []).filter((n) => n.id !== action.payload.id),
      };

    case 'RESTORE_NOTE': {
      const { note } = action.payload;
      if (!note) return state;
      return { ...state, notes: [note, ...(state.notes || [])] };
    }

    case 'ADD_SUBTASK': {
      const { taskId, title } = action.payload;
      if (!title || !title.trim()) return state;
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const subtasks = t.subtasks || [];
          const newSub = { id: uid('s'), title: title.trim(), done: false };
          return { ...t, subtasks: [...subtasks, newSub] };
        }),
      };
    }

    case 'TOGGLE_SUBTASK': {
      const { taskId, subtaskId, done } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const subtasks = (t.subtasks || []).map((st) =>
            st.id === subtaskId ? { ...st, done } : st
          );
          return { ...t, subtasks };
        }),
      };
    }

    case 'DELETE_SUBTASK': {
      const { taskId, subtaskId } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const subtasks = (t.subtasks || []).filter((st) => st.id !== subtaskId);
          return { ...t, subtasks };
        }),
      };
    }

    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, [action.payload.key]: action.payload.value } };

    case 'CLEAR_COMPLETED':
      return { ...state, tasks: state.tasks.filter((t) => !t.isCompleted) };

    case 'IMPORT':
      return migrate(action.payload.data);

    case 'RESET':
      return seed();



    default:
      return state;
  }
}

/* ============================================================
   Encryption helpers — thin wrappers that degrade to plaintext
   when the key can't be loaded (Expo Go / web / test env).
   ============================================================ */
async function encryptPayload(json) {
  try {
    const key = await getStoreKey();
    return encryptString(key, json);
  } catch (e) {
    console.warn('[Store] Encrypt failed, writing plaintext:', e.message);
    return json; // graceful degradation — better than data loss
  }
}

async function decryptPayload(raw) {
  // Detect whether the stored value is a hex ciphertext (produced by
  // encryptString: 32-char nonce + ciphertext, all hex) or legacy
  // plaintext JSON (starts with '{' or '[').
  if (!raw) return null;
  if (raw[0] === '{' || raw[0] === '[') {
    // Legacy plaintext — still parseable. Re-encrypt on next write.
    return raw;
  }
  try {
    const key = await getStoreKey();
    return decryptString(key, raw);
  } catch (e) {
    console.warn('[Store] Decrypt failed:', e.message);
    return null; // triggers fallback to pending or seed
  }
}

/* ============================================================
   Atomic persistence — write to .pending first, then swap.
   If the app crashes mid-write, the previous good state survives.
   Each write encrypts with a fresh nonce via AES-256-CTR.
   ============================================================ */
async function persistState(state) {
  const json = JSON.stringify(state);
  try {
    const blob = await encryptPayload(json);
    // 1. Write to pending key
    await AsyncStorage.setItem(KEY_PENDING, blob);
    // 2. Write to primary key (atomic swap)
    await AsyncStorage.setItem(KEY, blob);
    // 3. Clear pending (successful write)
    await AsyncStorage.removeItem(KEY_PENDING);
  } catch (e) {
    console.warn('[Store] Persist failed:', e.message);
  }
}

/**
 * Load state with crash recovery. Decrypts before parsing.
 * Handles legacy plaintext blobs transparently (auto-upgrades on
 * the next write).
 */
async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const json = await decryptPayload(raw);
      if (json) {
        const parsed = JSON.parse(json);
        return migrate(parsed);
      }
    }
  } catch (e) {
    console.warn('[Store] Primary key corrupt, trying pending fallback');
  }

  // Fallback: try the pending key
  try {
    const pending = await AsyncStorage.getItem(KEY_PENDING);
    if (pending) {
      const json = await decryptPayload(pending);
      if (json) {
        const parsed = JSON.parse(json);
        return migrate(parsed);
      }
    }
  } catch (e) {
    console.warn('[Store] Pending key also corrupt, starting fresh');
  }

  return seed();
}

/* ============================================================
   context + provider (async hydrate)
   ============================================================ */
const StoreCtx = createContext(null);

export function StoreProvider({ children, fallback = null }) {
  const [state, dispatch] = useReducer(reducer, null);
  const [ready, setReady] = useState(false);
  // Trial entitlement snapshot (SecureStore-backed). Resolved on boot,
  // never persisted into the JSON store — it lives in the secure layer.
  const [trial, setTrial] = useState({
    trialActive: false, expired: true, tampered: false, daysLeft: 0, installedAt: null,
  });
  // "Founders' 40" early-access verdict (server-confirmed, cached offline).
  const [founder, setFounder] = useState(false);
  const hydrated = useRef(false);
  const persistTimer = useRef(null);

  // load once from AsyncStorage (with crash recovery)
  useEffect(() => {
    (async () => {
      // Start / resolve the 7-day trial first so the very first render
      // already reflects the correct entitlement (no Pro→locked flash).
      try {
        const t = await initTrial();
        setTrial(t);
        if (t.justStarted) track('trial_started', { trialDays: 7 });
      } catch (e) {
        console.warn('[Trial] init failed:', e.message);
      }

      // "Founders' 40": claim a lifetime free slot on first launch (cached
      // forever after one server confirmation; safe no-op when disabled).
      try {
        const f = await claimFounderSlot();
        if (f.founder) {
          setFounder(true);
          if (f.checked) track('founder_granted', { rank: f.rank });
        }
      } catch (e) {
        console.warn('[Founder] claim failed:', e.message);
      }

      let initial = await loadState();
      initial = resetRecurringTasks(initial);
      dispatch({ type: 'HYDRATE', payload: initial });
      hydrated.current = true;
      setReady(true);

      // Restore all alarms after boot / app launch (Competitor Fix #1)
      rescheduleAllReminders(initial.tasks);
    })();
  }, []);

  // Debounced persist on change (after hydration)
  useEffect(() => {
    if (!hydrated.current || !state) return;

    // Debounce writes to prevent AsyncStorage contention under
    // rapid interactions (drag-reorder, quick completions)
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      persistState(state);
    }, PERSIST_DEBOUNCE_MS);

    // Keep any placed Android home-screen widget in sync (no-op elsewhere).
    // Widget updates are independently debounced in updateWidget.js.
    updateTodayWidget(state);
  }, [state]);

  // Sync reminders on change (optimized to only call native trigger on changes)
  const prevTasksMapRef = useRef(new Map());
  useEffect(() => {
    if (!hydrated.current || !state || !state.tasks) return;
    const currentTasks = state.tasks;
    const prevTasksMap = prevTasksMapRef.current;
    
    // Cancel deleted tasks
    const currentIds = new Set(currentTasks.map(t => t.id));
    for (const prevId of prevTasksMap.keys()) {
      if (!currentIds.has(prevId)) {
        cancelReminder(prevId);
      }
    }
    
    // Schedule / cancel tasks
    currentTasks.forEach((task) => {
      const prevTask = prevTasksMap.get(task.id);
      const hasChanged = !prevTask || 
        prevTask.title !== task.title ||
        prevTask.dueAt !== task.dueAt ||
        prevTask.reminderAt !== task.reminderAt ||
        prevTask.isCompleted !== task.isCompleted;
        
      if (hasChanged) {
        if (task.isCompleted) {
          cancelReminder(task.id);
        } else if (task.dueAt || task.reminderAt) {
          scheduleReminder(task);
        }
      }
    });
    
    const newMap = new Map();
    currentTasks.forEach(t => newMap.set(t.id, t));
    prevTasksMapRef.current = newMap;
    
    // Schedule / update morning digest
    scheduleMorningDigest(currentTasks);
  }, [state?.tasks]);

  const value = useMemo(() => {
    // Single entitlement seam for the whole app. The UI gates on
    // `settings.purchased`; we present it as true when the user is
    // genuinely Pro, OR the 7-day trial is still active, OR the
    // soft-launch FREE_FOR_ALL flag is on. The RAW saved `purchased`
    // is never mutated, so real purchases survive and trial expiry
    // cleanly re-locks the app (paywall fires off `trialExpired`).
    const realPurchase = !!(state && state.settings.purchased);
    // A "Founders' 40" member is Pro for life, exactly like a buyer.
    const isPro = realPurchase || founder || FREE_FOR_ALL || trial.trialActive;
    const effState =
      state && isPro && !state.settings.purchased
        ? { ...state, settings: { ...state.settings, purchased: true } }
        : state;
    return {
      state: effState,
      dispatch,
      actions: makeActions(dispatch),
      // Entitlement details for trial banners + paywall triggering.
      entitlement: {
        isPro,
        purchased: realPurchase,
        founder,
        trialActive: trial.trialActive,
        // `inTrial`: show the countdown banner only when monetization is
        // actually live (FREE_FOR_ALL off), the user is NOT a founder and
        // hasn't bought, and the trial clock is still running.
        inTrial: !realPurchase && !founder && !FREE_FOR_ALL && trial.trialActive,
        trialExpired: !realPurchase && !founder && !FREE_FOR_ALL && trial.expired,
        trialDaysLeft: trial.daysLeft,
        trialTampered: trial.tampered,
      },
    };
  }, [state, trial, founder]);

  if (!ready || !state) return fallback;
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
}

function resetRecurringTasks(state) {
  if (!state || !Array.isArray(state.tasks)) return state;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const weekStartMs = startOfWeek(today).getTime();
  const todayIsWeekday = isWeekday(today);

  let modified = false;
  const updatedTasks = state.tasks.map((task) => {
    if (!task.recurring || !task.isCompleted || !task.completedAt) return task;

    const comp = new Date(task.completedAt);
    comp.setHours(0, 0, 0, 0);
    const compMs = comp.getTime();

    let due = false;
    if (task.recurring === 'daily') {
      due = compMs < todayMs;
    } else if (task.recurring === 'weekdays') {
      // Reappears each weekday; stays "done" over the weekend.
      due = compMs < todayMs && todayIsWeekday;
    } else if (task.recurring === 'weekly') {
      // Reappears once the week rolls over.
      due = compMs < weekStartMs;
    } else if (task.recurring === 'biweekly') {
      // Reappears once bi-weekly week rolls over.
      const compWeekStartMs = startOfWeek(comp).getTime();
      const weeksDiff = (weekStartMs - compWeekStartMs) / (86400000 * 7);
      due = weeksDiff >= 2;
    } else if (task.recurring === 'monthly') {
      // Reappears when the calendar month rolls over.
      const compMonth = comp.getMonth();
      const compYear = comp.getFullYear();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      due = compYear < currentYear || (compYear === currentYear && compMonth < currentMonth);
    }

    if (due) {
      modified = true;
      return { ...task, isCompleted: false, completedAt: null };
    }
    return task;
  });

  return modified ? { ...state, tasks: updatedTasks } : state;
}
function triggerLayoutAnimation() {
  if (LayoutAnimation && LayoutAnimation.configureNext) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
}

function makeActions(dispatch) {
  return {
    addTask: (p) => {
      triggerLayoutAnimation();
      dispatch({ type: 'ADD_TASK', payload: p });
    },
    updateTask: (id, patch) => dispatch({ type: 'UPDATE_TASK', payload: { id, patch } }),
    toggleTask: (id, value) => {
      triggerLayoutAnimation();
      dispatch({ type: 'TOGGLE_TASK', payload: { id, value } });
    },
    deleteTask: (id) => {
      triggerLayoutAnimation();
      dispatch({ type: 'DELETE_TASK', payload: { id } });
    },
    restoreTask: (task) => {
      triggerLayoutAnimation();
      dispatch({ type: 'RESTORE_TASK', payload: { task } });
    },
    reorder: (orderedIds) => dispatch({ type: 'REORDER', payload: { orderedIds } }),
    addList: (name, accent, icon) => {
      triggerLayoutAnimation();
      dispatch({ type: 'ADD_LIST', payload: { name, accent, icon } });
    },
    updateList: (id, patch) => dispatch({ type: 'UPDATE_LIST', payload: { id, patch } }),
    deleteList: (id) => {
      triggerLayoutAnimation();
      dispatch({ type: 'DELETE_LIST', payload: { id } });
    },
    addNote: (p) => {
      triggerLayoutAnimation();
      dispatch({ type: 'ADD_NOTE', payload: p });
    },
    updateNote: (id, patch) => dispatch({ type: 'UPDATE_NOTE', payload: { id, patch } }),
    deleteNote: (id) => {
      triggerLayoutAnimation();
      dispatch({ type: 'DELETE_NOTE', payload: { id } });
    },
    restoreNote: (note) => {
      triggerLayoutAnimation();
      dispatch({ type: 'RESTORE_NOTE', payload: { note } });
    },
    addSubtask: (taskId, title) => dispatch({ type: 'ADD_SUBTASK', payload: { taskId, title } }),
    toggleSubtask: (taskId, subtaskId, done) => dispatch({ type: 'TOGGLE_SUBTASK', payload: { taskId, subtaskId, done } }),
    deleteSubtask: (taskId, subtaskId) => dispatch({ type: 'DELETE_SUBTASK', payload: { taskId, subtaskId } }),
    setSetting: (key, value) => dispatch({ type: 'SET_SETTING', payload: { key, value } }),
    clearCompleted: () => {
      triggerLayoutAnimation();
      dispatch({ type: 'CLEAR_COMPLETED' });
    },
    importData: (data) => dispatch({ type: 'IMPORT', payload: { data } }),
    reset: () => {
      triggerLayoutAnimation();
      dispatch({ type: 'RESET' });
    },
  };
}

/* ============================================================
   backup / restore — nothing leaves the device automatically.
   ============================================================ */
export async function exportData(state) {
  const payload = {
    app: 'HiTasky',
    schema: SCHEMA,
    exportedAt: nowIso(),
    lists: state.lists,
    tasks: state.tasks,
    settings: state.settings,
  };
  const stamp = new Date().toISOString().slice(0, 10);
  const uri = FileSystem.cacheDirectory + `hitasky-backup-${stamp}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save your HiTasky backup',
      UTI: 'public.json',
    });
  }
  return uri;
}

export async function importData() {
  const res = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets || !res.assets[0]) return null;
  const uri = res.assets[0].uri;
  const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  const data = JSON.parse(text);
  if (!data || (!Array.isArray(data.tasks) && !Array.isArray(data.lists))) {
    throw new Error('This file does not look like a HiTasky backup.');
  }
  return data;
}
