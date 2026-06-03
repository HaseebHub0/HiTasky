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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { uid } from './id.js';
import { startOfDay, startOfWeek, isWeekday } from './date.js';
import { ACCENTS } from '../theme.js';
import { scheduleReminder, cancelReminder, rescheduleAllReminders } from './notifications.js';
import { FREE_FOR_ALL } from './config.js';
import { updateTodayWidget } from '../widget/updateWidget.js';

const KEY = 'hitasky.v1';
const KEY_PENDING = 'hitasky.v1.pending';
const SCHEMA = 1;
const PERSIST_DEBOUNCE_MS = 500;

function nowIso() {
  return new Date().toISOString();
}

/* ---- seed content for a first run — rich mock data for performance testing ---- */
function seed() {
  const lWork = uid('l');
  const lStudy = uid('l');
  const lHome = uid('l');
  const lShopping = uid('l');
  const lPersonal = uid('l');
  const lFitness = uid('l');
  const lReading = uid('l');
  const lTravel = uid('l');
  const lFinance = uid('l');
  const lProjects = uid('l');
  const lHealth = uid('l');
  const lGarden = uid('l');
  const lCooking = uid('l');
  const lIdeas = uid('l');
  const lCreative = uid('l');
  const lArchive = uid('l');
  const lHustle = uid('l');
  const lFamily = uid('l');
  const lReminders = uid('l');
  const lBucket = uid('l');

  const lists = [
    { id: lWork, name: 'Work', accent: '#E58A4B', icon: 'briefcase', sortOrder: 0, createdAt: nowIso() },
    { id: lStudy, name: 'Study', accent: '#E0A24A', icon: 'book', sortOrder: 1, createdAt: nowIso() },
    { id: lHome, name: 'Home', accent: '#7E8C5A', icon: 'home', sortOrder: 2, createdAt: nowIso() },
    { id: lShopping, name: 'Shopping', accent: '#5A7E8C', icon: 'list', sortOrder: 3, createdAt: nowIso() },
    { id: lPersonal, name: 'Personal', accent: '#B57CA3', icon: 'heart', sortOrder: 4, createdAt: nowIso() },
    { id: lFitness, name: 'Fitness', accent: '#6FB890', icon: 'star', sortOrder: 5, createdAt: nowIso() },
    { id: lReading, name: 'Reading', accent: '#9A6A8C', icon: 'book', sortOrder: 6, createdAt: nowIso() },
    { id: lTravel, name: 'Travel', accent: '#7FA8D6', icon: 'star', sortOrder: 7, createdAt: nowIso() },
    { id: lFinance, name: 'Finance', accent: '#E58A4B', icon: 'list', sortOrder: 8, createdAt: nowIso() },
    { id: lProjects, name: 'Projects', accent: '#E0A24A', icon: 'briefcase', sortOrder: 9, createdAt: nowIso() },
    { id: lHealth, name: 'Health', accent: '#C25A4E', icon: 'heart', sortOrder: 10, createdAt: nowIso() },
    { id: lGarden, name: 'Garden', accent: '#7E8C5A', icon: 'star', sortOrder: 11, createdAt: nowIso() },
    { id: lCooking, name: 'Cooking', accent: '#5A7E8C', icon: 'list', sortOrder: 12, createdAt: nowIso() },
    { id: lIdeas, name: 'Ideas', accent: '#9A6A8C', icon: 'briefcase', sortOrder: 13, createdAt: nowIso() },
    { id: lCreative, name: 'Creative', accent: '#E58A4B', icon: 'star', sortOrder: 14, createdAt: nowIso() },
    { id: lArchive, name: 'Archive', accent: '#E0A24A', icon: 'book', sortOrder: 15, createdAt: nowIso() },
    { id: lHustle, name: 'Side Hustle', accent: '#C25A4E', icon: 'briefcase', sortOrder: 16, createdAt: nowIso() },
    { id: lFamily, name: 'Family', accent: '#7E8C5A', icon: 'heart', sortOrder: 17, createdAt: nowIso() },
    { id: lReminders, name: 'Reminders', accent: '#5A7E8C', icon: 'list', sortOrder: 18, createdAt: nowIso() },
    { id: lBucket, name: 'Bucket List', accent: '#9A6A8C', icon: 'star', sortOrder: 19, createdAt: nowIso() },
  ];

  // Helper for relative dates
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
  const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); };
  const hoursFromNow = (h) => { const d = new Date(); d.setHours(d.getHours() + h); return d.toISOString(); };

  const tasks = [
    // Today / active tasks
    { id: uid('t'), title: 'Reply to design feedback email', note: 'Check Figma comments too', listId: lWork, dueAt: hoursFromNow(2), reminderAt: null, recurring: null, priority: 'high', isCompleted: false, completedAt: null, sortOrder: 0, createdAt: nowIso() },
    { id: uid('t'), title: 'Review pull request #47', note: 'Focus on the API layer changes', listId: lWork, dueAt: hoursFromNow(4), reminderAt: null, recurring: null, priority: 'medium', isCompleted: false, completedAt: null, sortOrder: 1, createdAt: nowIso() },
    { id: uid('t'), title: 'Finish chapter 8 notes', note: '', listId: lStudy, dueAt: nowIso(), reminderAt: null, recurring: null, priority: 'medium', isCompleted: false, completedAt: null, sortOrder: 2, createdAt: nowIso() },
    { id: uid('t'), title: 'Buy groceries for the week', note: 'Milk, eggs, bread, spinach, chicken', listId: lShopping, dueAt: nowIso(), reminderAt: null, recurring: 'weekly', priority: 'medium', isCompleted: false, completedAt: null, sortOrder: 3, createdAt: nowIso() },
    { id: uid('t'), title: 'Morning workout — upper body', note: '', listId: lFitness, dueAt: nowIso(), reminderAt: null, recurring: 'daily', priority: 'low', isCompleted: false, completedAt: null, sortOrder: 4, createdAt: nowIso() },
    { id: uid('t'), title: 'Call the dentist for appointment', note: '', listId: lPersonal, dueAt: nowIso(), reminderAt: null, recurring: null, priority: 'high', isCompleted: false, completedAt: null, sortOrder: 5, createdAt: nowIso() },
    { id: uid('t'), title: 'Water the plants', note: '', listId: lHome, dueAt: nowIso(), reminderAt: null, recurring: 'daily', priority: 'low', isCompleted: false, completedAt: null, sortOrder: 6, createdAt: nowIso() },
    { id: uid('t'), title: 'Read 30 pages of Atomic Habits', note: 'Chapter on identity-based habits', listId: lReading, dueAt: nowIso(), reminderAt: null, recurring: null, priority: 'medium', isCompleted: false, completedAt: null, sortOrder: 7, createdAt: nowIso() },
    { id: uid('t'), title: 'Review monthly budget spreadsheet', note: 'Categorize expenses', listId: lFinance, dueAt: nowIso(), reminderAt: null, recurring: null, priority: 'high', isCompleted: false, completedAt: null, sortOrder: 8, createdAt: nowIso() },
    { id: uid('t'), title: 'Write project proposal draft', note: 'Include roadmap & estimates', listId: lProjects, dueAt: nowIso(), reminderAt: null, recurring: null, priority: 'high', isCompleted: false, completedAt: null, sortOrder: 9, createdAt: nowIso() },
    { id: uid('t'), title: 'Take daily vitamins & stretch', note: '10 min full body mobility', listId: lHealth, dueAt: nowIso(), reminderAt: null, recurring: 'daily', priority: 'medium', isCompleted: false, completedAt: null, sortOrder: 10, createdAt: nowIso() },
    
    // Overdue tasks
    { id: uid('t'), title: 'Submit expense report', note: 'Q2 receipts', listId: lWork, dueAt: daysAgo(2), reminderAt: null, recurring: null, priority: 'high', isCompleted: false, completedAt: null, sortOrder: 11, createdAt: daysAgo(5) },
    { id: uid('t'), title: 'Fix the leaking kitchen faucet', note: 'Call plumber if needed', listId: lHome, dueAt: daysAgo(1), reminderAt: null, recurring: null, priority: 'medium', isCompleted: false, completedAt: null, sortOrder: 12, createdAt: daysAgo(3) },
    { id: uid('t'), title: 'Pay monthly utility credit card', note: 'Auto-debit fallback check', listId: lFinance, dueAt: daysAgo(1), reminderAt: null, recurring: null, priority: 'high', isCompleted: false, completedAt: null, sortOrder: 13, createdAt: daysAgo(2) },
    
    // Scheduled (future) tasks
    { id: uid('t'), title: 'Book flight to Istanbul', note: 'Check prices on Skyscanner', listId: lTravel, dueAt: daysFromNow(3), reminderAt: null, recurring: null, priority: 'medium', isCompleted: false, completedAt: null, sortOrder: 14, createdAt: nowIso() },
    { id: uid('t'), title: 'Prepare presentation slides', note: 'Use the new brand template', listId: lWork, dueAt: daysFromNow(2), reminderAt: null, recurring: null, priority: 'high', isCompleted: false, completedAt: null, sortOrder: 15, createdAt: nowIso() },
    { id: uid('t'), title: 'Renew gym membership', note: '', listId: lFitness, dueAt: daysFromNow(5), reminderAt: null, recurring: null, priority: 'low', isCompleted: false, completedAt: null, sortOrder: 16, createdAt: nowIso() },
    { id: uid('t'), title: 'Research Airbnb for Cappadocia', note: 'Cave hotels look amazing', listId: lTravel, dueAt: daysFromNow(7), reminderAt: null, recurring: null, priority: 'low', isCompleted: false, completedAt: null, sortOrder: 17, createdAt: nowIso() },
    { id: uid('t'), title: 'Study for algorithms exam', note: 'Dynamic programming & graphs', listId: lStudy, dueAt: daysFromNow(4), reminderAt: null, recurring: null, priority: 'high', isCompleted: false, completedAt: null, sortOrder: 18, createdAt: nowIso() },
    { id: uid('t'), title: 'Repot the snake plant', note: 'Needs larger clay pot & soil', listId: lGarden, dueAt: daysFromNow(4), reminderAt: null, recurring: null, priority: 'low', isCompleted: false, completedAt: null, sortOrder: 19, createdAt: nowIso() },
    { id: uid('t'), title: 'Schedule annual health checkup', note: 'Contact Dr. Miller office', listId: lHealth, dueAt: daysFromNow(6), reminderAt: null, recurring: null, priority: 'medium', isCompleted: false, completedAt: null, sortOrder: 20, createdAt: nowIso() },
    { id: uid('t'), title: 'Register side-hustle domain name', note: 'Check .com availability', listId: lHustle, dueAt: daysFromNow(8), reminderAt: null, recurring: null, priority: 'medium', isCompleted: false, completedAt: null, sortOrder: 21, createdAt: nowIso() },
    { id: uid('t'), title: 'Change home water filter', note: 'Under-sink system', listId: lReminders, dueAt: daysFromNow(9), reminderAt: null, recurring: null, priority: 'low', isCompleted: false, completedAt: null, sortOrder: 22, createdAt: nowIso() },
    
    // Undated tasks
    { id: uid('t'), title: 'Organize photo gallery', note: '', listId: lPersonal, dueAt: null, reminderAt: null, recurring: null, priority: 'low', isCompleted: false, completedAt: null, sortOrder: 23, createdAt: nowIso() },
    { id: uid('t'), title: 'Learn basic Turkish phrases', note: 'Merhaba, Teşekkürler, Lütfen', listId: lTravel, dueAt: null, reminderAt: null, recurring: null, priority: 'low', isCompleted: false, completedAt: null, sortOrder: 24, createdAt: nowIso() },
    { id: uid('t'), title: 'Learn to surf', note: 'Look up schools in Portugal', listId: lBucket, dueAt: null, reminderAt: null, recurring: null, priority: 'low', isCompleted: false, completedAt: null, sortOrder: 25, createdAt: nowIso() },
    { id: uid('t'), title: 'Visit Northern Lights in Norway', note: 'Plan for winter season', listId: lBucket, dueAt: null, reminderAt: null, recurring: null, priority: 'low', isCompleted: false, completedAt: null, sortOrder: 26, createdAt: nowIso() },
    
    // Completed tasks (for Journal)
    { id: uid('t'), title: 'Send the Fellows essay', note: '', listId: lWork, dueAt: daysAgo(0), reminderAt: null, recurring: null, priority: 'medium', isCompleted: true, completedAt: nowIso(), sortOrder: 27, createdAt: daysAgo(1) },
    { id: uid('t'), title: 'Clean desk and organize cables', note: '', listId: lHome, dueAt: daysAgo(0), reminderAt: null, recurring: null, priority: 'low', isCompleted: true, completedAt: nowIso(), sortOrder: 28, createdAt: daysAgo(1) },
    { id: uid('t'), title: 'Finish React Native tutorial', note: '', listId: lStudy, dueAt: daysAgo(1), reminderAt: null, recurring: null, priority: 'medium', isCompleted: true, completedAt: daysAgo(1), sortOrder: 29, createdAt: daysAgo(3) },
    { id: uid('t'), title: 'Run 5K at the park', note: 'Personal best: 24:30', listId: lFitness, dueAt: daysAgo(1), reminderAt: null, recurring: null, priority: 'medium', isCompleted: true, completedAt: daysAgo(1), sortOrder: 30, createdAt: daysAgo(2) },
    { id: uid('t'), title: 'Order birthday gift for Mom', note: 'She mentioned wanting a scarf', listId: lShopping, dueAt: daysAgo(2), reminderAt: null, recurring: null, priority: 'high', isCompleted: true, completedAt: daysAgo(2), sortOrder: 31, createdAt: daysAgo(4) },
    { id: uid('t'), title: 'Backup phone photos', note: '', listId: lPersonal, dueAt: daysAgo(2), reminderAt: null, recurring: null, priority: 'low', isCompleted: true, completedAt: daysAgo(2), sortOrder: 32, createdAt: daysAgo(5) },
    { id: uid('t'), title: 'Read chapter on mindfulness', note: '', listId: lReading, dueAt: daysAgo(3), reminderAt: null, recurring: null, priority: 'low', isCompleted: true, completedAt: daysAgo(3), sortOrder: 33, createdAt: daysAgo(6) },
    { id: uid('t'), title: 'Weekly meal prep', note: 'Chicken, rice, veggies for 5 days', listId: lHome, dueAt: daysAgo(3), reminderAt: null, recurring: 'weekly', priority: 'medium', isCompleted: true, completedAt: daysAgo(3), sortOrder: 34, createdAt: daysAgo(7) },
    { id: uid('t'), title: 'Schedule client sync call', note: 'Review project milestones', listId: lProjects, dueAt: daysAgo(0), reminderAt: null, recurring: null, priority: 'medium', isCompleted: true, completedAt: nowIso(), sortOrder: 35, createdAt: daysAgo(2) },
    { id: uid('t'), title: 'Fertilize the backyard roses', note: 'Use organic fish emulsion', listId: lGarden, dueAt: daysAgo(1), reminderAt: null, recurring: null, priority: 'low', isCompleted: true, completedAt: daysAgo(1), sortOrder: 36, createdAt: daysAgo(4) },
    { id: uid('t'), title: 'Meal prep Sunday dinner', note: 'Sourdough & tomato soup', listId: lCooking, dueAt: daysAgo(0), reminderAt: null, recurring: null, priority: 'medium', isCompleted: true, completedAt: nowIso(), sortOrder: 37, createdAt: daysAgo(1) },
    { id: uid('t'), title: 'Brainstorm side-project ideas', note: 'Draw 3 app wireframes', listId: lIdeas, dueAt: daysAgo(1), reminderAt: null, recurring: null, priority: 'low', isCompleted: true, completedAt: daysAgo(1), sortOrder: 38, createdAt: daysAgo(2) },
    { id: uid('t'), title: 'Plan Sunday family brunch', note: 'Call sibling to coordinate', listId: lFamily, dueAt: daysAgo(0), reminderAt: null, recurring: null, priority: 'medium', isCompleted: true, completedAt: nowIso(), sortOrder: 39, createdAt: daysAgo(1) },
  ];

  const notes = [
    { id: uid('n'), title: 'App ideas', content: 'Habit tracker with gamification\nAI-powered recipe generator\nMinimalist weather app', accent: '#E58A4B', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Meeting notes — Sprint 14', content: 'Focus on onboarding flow redesign.\nDeadline: end of week.\nAssign: Haseeb — UI, Ali — API.', accent: '#6FB890', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Books to read', content: 'Atomic Habits — James Clear\nDeep Work — Cal Newport\nThe Design of Everyday Things\nSteal Like an Artist', accent: '#9A6A8C', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Grocery list extras', content: 'Avocados, hummus, dark chocolate, green tea, oat milk', accent: '#5A7E8C', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Workout split', content: 'Mon: Chest + Triceps\nTue: Back + Biceps\nWed: Legs\nThu: Shoulders\nFri: Full body\nSat: Cardio\nSun: Rest', accent: '#7E8C5A', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Travel packing list', content: 'Passport, charger, adapter, sunscreen, comfortable shoes, camera, travel pillow', accent: '#7FA8D6', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Quotes I love', content: '"The best time to plant a tree was 20 years ago. The second best time is now."\n"Be the change you wish to see in the world."', accent: '#E0A24A', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Design inspiration', content: 'Glassmorphism cards\nNeumorphic buttons\nGradient mesh backgrounds\nMicro-animations on hover\nDynamic island UI pattern', accent: '#B57CA3', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Inspiring books list', content: 'Tao Te Ching\nZen Mind, Beginners Mind\nWabi-Sabi for Artists, Designers, Poets & Philosophers', accent: '#7E8C5A', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Shopping list for next week', content: 'Almonds, cold brew coffee, bananas, apples, chia seeds, tofu', accent: '#E58A4B', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Side hustle checklist', content: '1. Register domain\n2. Set up landing page\n3. Launch newsletter\n4. Write first post', accent: '#C25A4E', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Healthy recipes', content: 'Tofu stir fry with broccoli\nQuinoa salad with lemon vinaigrette\nOatmeal with berries and walnuts', accent: '#5A7E8C', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Gift ideas for holidays', content: 'Dad: Leather wallet\nMom: Wool scarf\nSister: Watercolor paint set', accent: '#9A6A8C', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Weekly reflection template', content: 'What went well?\nWhat challenges did I face?\nWhat am I grateful for?\nFocus for next week?', accent: '#E0A24A', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'UI redesign priorities', content: '1. Fluffy bubble tab bar\n2. Pulsing task card completions\n3. Dynamic onboarding screens', accent: '#B57CA3', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Turkish vocabulary practice', content: 'Merhaba (Hello)\nTesekkurler (Thanks)\nLutfen (Please)\nNasılsın (How are you?)', accent: '#7FA8D6', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Gardening tips & notes', content: 'Water snake plant only once in 2 weeks.\nRoses need full sun & fertilizer in spring.', accent: '#7E8C5A', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Piano pieces to learn', content: 'Gymnopedie No.1 — Erik Satie\nClair de Lune — Debussy\nPrelude in E Minor — Chopin', accent: '#E58A4B', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'Finance goals 2026', content: 'Save 30% of income monthly.\nInvest in low-cost index funds.\nBuild emergency fund for 6 months.', accent: '#C25A4E', createdAt: nowIso(), updatedAt: nowIso() },
    { id: uid('n'), title: 'App deployment checklist', content: '1. Build production bundle\n2. Generate App Store assets\n3. Submit for beta testing\n4. Release to public', accent: '#5A7E8C', createdAt: nowIso(), updatedAt: nowIso() },
  ];

  return {
    schema: SCHEMA,
    lists,
    tasks,
    notes,
    settings: {
      theme: 'dark',
      haptics: true,
      inkStrike: true,
      sound: false,
      onboarded: false,
      purchased: false,
      purchasedAt: null,
      accent: null,
      pet: 'zen',
      sansTitles: false,
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
      ...t,
    })),
    notes: Array.isArray(data.notes) ? data.notes : [],
  };
  return validateState(merged);
}

/* ============================================================
   reducer (identical logic to web)
   ============================================================ */
function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;

    case 'ADD_TASK': {
      const { title, note, listId, dueAt, reminderAt, recurring, priority } = action.payload;
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
        priority: priority || 'medium',
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

    case 'ADD_NOTE': {
      const { title, content, accent } = action.payload;
      const note = {
        id: uid('n'),
        title: (title || '').trim(),
        content: (content || '').trim(),
        accent: accent || ACCENTS[0],
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
   Atomic persistence — write to .pending first, then swap.
   If the app crashes mid-write, the previous good state survives.
   ============================================================ */
async function persistState(state) {
  const json = JSON.stringify(state);
  try {
    // 1. Write to pending key
    await AsyncStorage.setItem(KEY_PENDING, json);
    // 2. Write to primary key (atomic swap)
    await AsyncStorage.setItem(KEY, json);
    // 3. Clear pending (successful write)
    await AsyncStorage.removeItem(KEY_PENDING);
  } catch (e) {
    console.warn('[Store] Persist failed:', e.message);
  }
}

/**
 * Load state with crash recovery. If the primary key is corrupt,
 * try the pending key as a fallback.
 */
async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrate(parsed);
    }
  } catch (e) {
    console.warn('[Store] Primary key corrupt, trying pending fallback');
  }

  // Fallback: try the pending key
  try {
    const pending = await AsyncStorage.getItem(KEY_PENDING);
    if (pending) {
      const parsed = JSON.parse(pending);
      return migrate(parsed);
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
  const hydrated = useRef(false);
  const persistTimer = useRef(null);

  // load once from AsyncStorage (with crash recovery)
  useEffect(() => {
    (async () => {
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
    addNote: (p) => dispatch({ type: 'ADD_NOTE', payload: p }),
    updateNote: (id, patch) => dispatch({ type: 'UPDATE_NOTE', payload: { id, patch } }),
    deleteNote: (id) => dispatch({ type: 'DELETE_NOTE', payload: { id } }),
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
