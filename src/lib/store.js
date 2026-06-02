// ============================================================
// HiTasky (mobile) — offline-first store.
// Same single-source-of-truth model as the web app, persisted to
// AsyncStorage. No network, ever. Backup/restore goes through the
// system share sheet & document picker (SAF analogue).
// ============================================================
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { uid } from './id.js';
import { startOfDay, startOfWeek, isWeekday } from './date.js';
import { ACCENTS } from '../theme.js';
import { scheduleReminder, cancelReminder } from './notifications.js';
import { FREE_FOR_ALL } from './config.js';
import { updateTodayWidget } from '../widget/updateWidget.js';

const KEY = 'hitasky.v1';
const SCHEMA = 1;

function nowIso() {
  return new Date().toISOString();
}

/* ---- seed content for a first run (mirrors the design mocks) ---- */
function seed() {
  const lWork = uid('l');
  const lStudy = uid('l');
  const lHome = uid('l');
  const lShopping = uid('l');
  const lPersonal = uid('l');

  const lists = [
    { id: lWork, name: 'Work', accent: '#E58A4B', icon: 'briefcase', sortOrder: 0, createdAt: nowIso() },
    { id: lStudy, name: 'Study', accent: '#E0A24A', icon: 'book', sortOrder: 1, createdAt: nowIso() },
    { id: lHome, name: 'Home', accent: '#7E8C5A', icon: 'home', sortOrder: 2, createdAt: nowIso() },
    { id: lShopping, name: 'Shopping', accent: '#5A7E8C', icon: 'list', sortOrder: 3, createdAt: nowIso() },
    { id: lPersonal, name: 'Personal', accent: '#B57CA3', icon: 'heart', sortOrder: 4, createdAt: nowIso() },
  ];

  return {
    schema: SCHEMA,
    lists,
    tasks: [],
    settings: {
      theme: 'dark',
      haptics: true,
      inkStrike: true,
      sound: false,
      onboarded: false,
      purchased: false,
      accent: '#E58A4B',
      sansTitles: false,
    },
  };
}

function migrate(data) {
  const base = seed();
  return {
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
      ...t,
    })),
  };
}

/* ============================================================
   reducer (identical logic to web)
   ============================================================ */
function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;

    case 'ADD_TASK': {
      const { title, note, listId, dueAt, reminderAt, recurring } = action.payload;
      if (!title || !title.trim()) return state;
      const minOrder = Math.min(0, ...state.tasks.map((t) => t.sortOrder)) - 1;
      const task = {
        id: uid('t'),
        title: title.trim(),
        note: (note || '').trim(),
        listId: listId || null,
        dueAt: dueAt || null,
        reminderAt: reminderAt || null,
        recurring: recurring || null,
        isCompleted: false,
        completedAt: null,
        sortOrder: minOrder,
        createdAt: nowIso(),
      };
      return { ...state, tasks: [task, ...state.tasks] };
    }

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.payload.id ? { ...t, ...action.payload.patch } : t)),
      };

    case 'TOGGLE_TASK': {
      const { id, value } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, isCompleted: value, completedAt: value ? nowIso() : null } : t
        ),
      };
    }

    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload.id) };

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
   context + provider (async hydrate)
   ============================================================ */
const StoreCtx = createContext(null);

export function StoreProvider({ children, fallback = null }) {
  const [state, dispatch] = useReducer(reducer, null);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // load once from AsyncStorage
  useEffect(() => {
    (async () => {
      let initial;
      try {
        const raw = await AsyncStorage.getItem(KEY);
        initial = raw ? migrate(JSON.parse(raw)) : seed();
        initial = resetRecurringTasks(initial);
      } catch (e) {
        initial = seed();
      }
      dispatch({ type: 'HYDRATE', payload: initial });
      hydrated.current = true;
      setReady(true);
    })();
  }, []);

  // persist on change (after hydration)
  useEffect(() => {
    if (!hydrated.current || !state) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
    // keep any placed Android home-screen widget in sync (no-op elsewhere)
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
  }, [state?.tasks]);

  const value = useMemo(() => {
    // Free phase: present `purchased` as true to the whole UI without
    // persisting it, so every paywall check passes. We still save the
    // raw state, so flipping FREE_FOR_ALL back to false restores gating.
    const effState =
      state && FREE_FOR_ALL && !state.settings.purchased
        ? { ...state, settings: { ...state.settings, purchased: true } }
        : state;
    return { state: effState, dispatch, actions: makeActions(dispatch) };
  }, [state]);

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
    }

    if (due) {
      modified = true;
      return { ...task, isCompleted: false, completedAt: null };
    }
    return task;
  });

  return modified ? { ...state, tasks: updatedTasks } : state;
}

function makeActions(dispatch) {
  return {
    addTask: (p) => dispatch({ type: 'ADD_TASK', payload: p }),
    updateTask: (id, patch) => dispatch({ type: 'UPDATE_TASK', payload: { id, patch } }),
    toggleTask: (id, value) => dispatch({ type: 'TOGGLE_TASK', payload: { id, value } }),
    deleteTask: (id) => dispatch({ type: 'DELETE_TASK', payload: { id } }),
    reorder: (orderedIds) => dispatch({ type: 'REORDER', payload: { orderedIds } }),
    addList: (name, accent, icon) => dispatch({ type: 'ADD_LIST', payload: { name, accent, icon } }),
    updateList: (id, patch) => dispatch({ type: 'UPDATE_LIST', payload: { id, patch } }),
    deleteList: (id) => dispatch({ type: 'DELETE_LIST', payload: { id } }),
    setSetting: (key, value) => dispatch({ type: 'SET_SETTING', payload: { key, value } }),
    clearCompleted: () => dispatch({ type: 'CLEAR_COMPLETED' }),
    importData: (data) => dispatch({ type: 'IMPORT', payload: { data } }),
    reset: () => dispatch({ type: 'RESET' }),
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
