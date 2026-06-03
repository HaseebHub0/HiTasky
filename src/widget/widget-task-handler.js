// ============================================================
// Headless task handler for the Android widget. Reads the same
// AsyncStorage the app persists to, derives today's tasks, and
// renders the widget. Runs without the React app being open.
//
// Error recovery: every path returns a valid widget render, even
// on storage corruption or parse failures — the widget never
// enters an infinite loading loop or displays blank info.
// ============================================================
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TodayWidget } from './TodayWidget.js';
import { todayTasks } from '../lib/selectors.js';
import { headerDate } from '../lib/date.js';

const KEY = 'hitasky.v1';

// Fallback data shown when state cannot be loaded
const FALLBACK_DATA = {
  tasks: [],
  dateLabel: headerDate(),
  theme: 'dark',
};

export async function loadWidgetData() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...FALLBACK_DATA, dateLabel: headerDate() };

    const state = JSON.parse(raw);
    if (!state || !Array.isArray(state.tasks)) {
      return { ...FALLBACK_DATA, dateLabel: headerDate() };
    }

    return {
      tasks: todayTasks(state).map((t) => t.title),
      dateLabel: headerDate(),
      theme: state.settings?.theme || 'dark',
    };
  } catch (e) {
    // Storage read or JSON parse failed — return a valid empty widget
    // so the widget never shows blank/broken state
    console.warn('[Widget Handler] loadWidgetData failed, using fallback:', e.message);
    return { ...FALLBACK_DATA, dateLabel: headerDate() };
  }
}

export async function widgetTaskHandler(props) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await loadWidgetData();
      props.renderWidget(<TodayWidget {...data} />);
      break;
    }
    case 'WIDGET_CLICK': {
      // Re-render the widget with fresh data when tapped.
      // The widget's clickAction="OPEN_APP" handles launching
      // the app; here we just ensure the widget is up-to-date.
      const data = await loadWidgetData();
      props.renderWidget(<TodayWidget {...data} />);
      break;
    }
    case 'WIDGET_DELETED':
    default:
      break;
  }
}
