// ============================================================
// Greeting intelligence & streak tracking.
//
// Context-aware greetings based on time-of-day, task state,
// and day of week. Plus a simple "consecutive days with
// completions" streak counter persisted in AsyncStorage.
//
// This is the kind of detail that makes an app feel human.
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = 'hitasky.streak';

// ---- context-aware greetings ----

const MORNING_GREETINGS = [
  "Let's make today count.",
  "Fresh day, fresh start.",
  "What matters most today?",
  "Good morning. You've got this.",
];

const EARLY_BIRD = [
  "Early bird. The world is still quiet.",
  "Up before the sun. That's dedication.",
  "The early hours are yours.",
];

const AFTERNOON = [
  "Afternoon push. Stay with it.",
  "Halfway there. Keep going.",
  "The afternoon is yours.",
];

const EVENING = [
  "Winding down? Review your wins.",
  "Evening mode. Go easy.",
  "Almost done for today.",
];

const WEEKEND = [
  "It's the weekend. Be kind to yourself.",
  "Saturday energy — do what feels right.",
  "Rest is productive too.",
];

const ALL_DONE = [
  "Clean slate. You earned it.",
  "Nothing pending. Well done.",
  "All done. Take a breath.",
];

const LOTS_TO_DO = [
  "Full plate today. Start with one.",
  "One thing at a time.",
  "Pick the top one and begin.",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns a context-aware greeting string.
 * @param {number} taskCount - number of active today tasks
 * @param {number} doneCount - number of tasks completed today
 */
export function getGreeting(taskCount = 0, doneCount = 0) {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0=Sun, 6=Sat

  // Weekend override
  if ((day === 0 || day === 6) && taskCount === 0) {
    return pick(WEEKEND);
  }

  // All tasks done
  if (taskCount === 0 && doneCount > 0) {
    return pick(ALL_DONE);
  }

  // Lots of tasks
  if (taskCount >= 5) {
    return pick(LOTS_TO_DO);
  }

  // Time-based
  if (hour < 6) return pick(EARLY_BIRD);
  if (hour < 12) return pick(MORNING_GREETINGS);
  if (hour < 17) return pick(AFTERNOON);
  return pick(EVENING);
}

// ---- streak tracking ----

/**
 * Load the current streak data from AsyncStorage.
 * Returns { currentStreak: number, lastDate: string|null }
 */
export async function loadStreak() {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }
  return { currentStreak: 0, lastDate: null };
}

/**
 * Record that a task was completed today.
 * Increments streak if this is a new day, maintains if same day,
 * resets if a day was skipped.
 * Returns the updated streak count.
 */
export async function recordCompletion() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await loadStreak();

  if (data.lastDate === today) {
    // Already counted today — no change
    return data.currentStreak;
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (data.lastDate === yesterday) {
    // Consecutive day — increment streak
    data.currentStreak += 1;
  } else if (!data.lastDate) {
    // First ever completion
    data.currentStreak = 1;
  } else {
    // Gap — streak broken, start fresh
    data.currentStreak = 1;
  }

  data.lastDate = today;
  try {
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data));
  } catch (_) { /* ignore */ }

  return data.currentStreak;
}

/**
 * Get streak display text.
 * Returns null if streak < 2 (don't show for 0 or 1 day).
 */
export function streakText(count) {
  if (!count || count < 2) return null;
  return `🔥 ${count}-day streak`;
}
