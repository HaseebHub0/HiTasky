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
import { getPet } from '../lib/pets.js';

const KEY = 'hitasky.v1';

// Fallback data shown when state cannot be loaded
const FALLBACK_DATA = {
  tasks: [],
  dateLabel: headerDate(),
  theme: 'dark',
  pet: '🦊',
};

export async function loadWidgetData() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...FALLBACK_DATA, dateLabel: headerDate() };

    const state = JSON.parse(raw);
    if (!state || !Array.isArray(state.tasks)) {
      return { ...FALLBACK_DATA, dateLabel: headerDate() };
    }

    const themeStr = state.settings?.theme || 'dark';
    const petId = state.settings?.pet || 'zen';
    const accent = state.settings?.accent || null;
    
    // Default fallback emoji if pet logic fails
    let petEmoji = '🐸';
    try { petEmoji = getPet(petId)?.emoji || '🐸'; } catch(e) {}

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
      console.warn('[Widget Handler] makeTheme failed', e);
    }

    return {
      tasks: todayTasks(state).map((t) => ({ id: t.id, title: t.title })),
      dateLabel: headerDate(),
      colors: colors,
      pet: petEmoji,
    };
  } catch (e) {
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
      if (props.clickAction === 'CUSTOM' && props.clickActionData?.action === 'COMPLETE') {
        try {
          const taskId = props.clickActionData.id;
          const raw = await AsyncStorage.getItem(KEY);
          if (raw) {
            const state = JSON.parse(raw);
            if (state && Array.isArray(state.tasks)) {
              state.tasks = state.tasks.map(t => 
                t.id === taskId 
                  ? { ...t, isCompleted: true, completedAt: new Date().toISOString() } 
                  : t
              );
              
              if (state.settings) {
                const pad = (n) => String(n).padStart(2, '0');
                const now = new Date();
                const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                const yesterday = (() => {
                  const y = new Date(Date.now() - 86400000);
                  return `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
                })();

                const currentStreak = state.settings.streak || 0;
                const lastDate = state.settings.streakLastDate;

                if (lastDate !== today) {
                  let newStreak = 1;
                  if (lastDate === yesterday) {
                    newStreak = currentStreak + 1;
                  }
                  state.settings.streak = newStreak;
                  state.settings.streakLastDate = today;
                }
              }

              await AsyncStorage.setItem(KEY, JSON.stringify(state));
            }
          }
        } catch(e) {
          console.warn('[Widget Handler] Complete task failed', e);
        }
      }
      
      const data = await loadWidgetData();
      props.renderWidget(<TodayWidget {...data} />);
      break;
    }
    case 'WIDGET_DELETED':
    default:
      break;
  }
}
