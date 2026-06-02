// ============================================================
// Pushes a fresh render to any placed "Today" widgets when the
// app's data changes. Android-only and fully guarded so it is a
// no-op in Expo Go / iOS / when the native module is absent.
// ============================================================
import React from 'react';
import { Platform } from 'react-native';
import { todayTasks } from '../lib/selectors.js';
import { headerDate } from '../lib/date.js';

export async function updateTodayWidget(state) {
  if (Platform.OS !== 'android' || !state) return;

  let requestWidgetUpdate;
  let TodayWidget;
  try {
    ({ requestWidgetUpdate } = require('react-native-android-widget'));
    ({ TodayWidget } = require('./TodayWidget.js'));
  } catch (e) {
    return; // native module not available (e.g. Expo Go)
  }

  const data = {
    tasks: todayTasks(state).map((t) => t.title),
    dateLabel: headerDate(),
    theme: state.settings?.theme || 'dark',
  };

  try {
    await requestWidgetUpdate({
      widgetName: 'Today',
      renderWidget: () => <TodayWidget {...data} />,
      widgetNotFound: () => {},
    });
  } catch (e) {
    // no widgets placed, or native call unavailable — ignore
  }
}
