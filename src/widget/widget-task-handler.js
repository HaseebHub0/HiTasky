// ============================================================
// Headless task handler for the Android widget. Reads the same
// AsyncStorage the app persists to, derives today's tasks, and
// renders the widget. Runs without the React app being open.
// ============================================================
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TodayWidget } from './TodayWidget.js';
import { todayTasks } from '../lib/selectors.js';
import { headerDate } from '../lib/date.js';

const KEY = 'hitasky.v1';

export async function loadWidgetData() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const state = raw ? JSON.parse(raw) : null;
    if (!state || !Array.isArray(state.tasks)) {
      return { tasks: [], dateLabel: headerDate(), theme: 'dark' };
    }
    return {
      tasks: todayTasks(state).map((t) => t.title),
      dateLabel: headerDate(),
      theme: state.settings?.theme || 'dark',
    };
  } catch (e) {
    return { tasks: [], dateLabel: headerDate(), theme: 'dark' };
  }
}

export async function widgetTaskHandler(props) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK': {
      const data = await loadWidgetData();
      props.renderWidget(<TodayWidget {...data} />);
      break;
    }
    case 'WIDGET_DELETED':
    default:
      break;
  }
}
