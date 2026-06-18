// ============================================================
// Pushes a fresh render to any placed "Today" widgets when the
// app's data changes. Android-only and fully guarded so it is a
// no-op in Expo Go / iOS / when the native module is absent.
//
// Reliability features (Competitor Fix #2):
//   • 300ms debounce — batches rapid state changes into one render
//   • Data cache — skips update if nothing visually changed
//   • Error boundary — widget never goes blank on errors
// ============================================================
import React from 'react';
import { Platform } from 'react-native';
import { todayTasks } from '../lib/selectors.js';
import { headerDate } from '../lib/date.js';

// Debounce timer and last-known-good data cache
let pendingUpdate = null;
let lastWidgetDataJSON = null;

export async function updateTodayWidget(state) {
  if (Platform.OS !== 'android' || !state) return;

  // Compute fresh widget data
  const themeStr = state.settings?.theme || 'dark';
  const petId = state.settings?.pet || 'zen';
  const accent = state.settings?.accent || null;
  
  // We must import getPet dynamically or at the top. Let's do it inline to avoid circular deps if any, 
  // though pets.js has no circular deps.
  const { getPet } = require('../lib/pets.js');
  const petEmoji = getPet(petId)?.emoji || '🐸';

  let colors = { bg: '#18140F', surface: '#221D17', text: '#F3ECDF', muted: '#7C7264', accent: '#E58A4B' };
  try {
    const { makeTheme } = require('../theme.js');
    const t = makeTheme(themeStr === 'light' ? 'light' : 'dark', accent, petId);
    colors = {
      bg: t.bg,
      surface: t.surface,
      text: t.text,
      muted: t.text3,
      accent: t.accent,
    };
  } catch (e) {
    console.warn('[updateWidget] makeTheme failed', e);
  }

  const data = {
    tasks: todayTasks(state).map((t) => ({ id: t.id, title: t.title })),
    dateLabel: headerDate(),
    colors: colors,
    pet: petEmoji,
  };

  // Skip update if data is identical to last render (prevents flicker)
  const dataJSON = JSON.stringify(data);
  if (dataJSON === lastWidgetDataJSON) return;

  // Debounce: cancel any pending update and schedule a new one.
  // This batches rapid state changes (e.g. completing 5 tasks quickly)
  // into a single widget render, preventing the "flicker" effect that
  // plagues competitor widgets.
  clearTimeout(pendingUpdate);
  pendingUpdate = setTimeout(() => {
    performWidgetUpdate(data, dataJSON);
  }, 300);
}

async function performWidgetUpdate(data, dataJSON) {
  let requestWidgetUpdate;
  let TodayWidget;
  try {
    ({ requestWidgetUpdate } = require('react-native-android-widget'));
    ({ TodayWidget } = require('./TodayWidget.js'));
  } catch (e) {
    return; // native module not available (e.g. Expo Go)
  }

  try {
    await requestWidgetUpdate({
      widgetName: 'Today',
      renderWidget: () => <TodayWidget {...data} />,
      widgetNotFound: () => {},
    });
    // Only update cache on successful render
    lastWidgetDataJSON = dataJSON;
  } catch (e) {
    // Widget update failed — do NOT clear the cache, so the widget
    // retains its last-known-good state instead of going blank.
    console.warn('[Widget] Update failed, retaining last state:', e.message);
  }
}
