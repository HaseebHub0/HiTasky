// ============================================================
// Derived views over the store. Pure functions — no state.
// ============================================================
import { isToday, isOverdue, isSameDay, addDays } from './date.js';

const bySort = (a, b) => a.sortOrder - b.sortOrder;

// Priority weighting — High surfaces first, then Medium, then Low.
// Tasks with no priority set are treated as Medium.
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
function prank(t) {
  const r = PRIORITY_RANK[t && t.priority];
  return r == null ? 1 : r;
}

// Smart task order: scheduled date & time first (sooner = higher),
// then priority (High → Low), then creation time as a stable
// tiebreak. Dated tasks always sort ahead of undated ones, so a
// brand-new undated task no longer jumps to the top.
export function smartCompare(a, b) {
  const ta = a.dueAt ? new Date(a.dueAt).getTime() : null;
  const tb = b.dueAt ? new Date(b.dueAt).getTime() : null;
  if (ta != null && tb != null) {
    if (ta !== tb) return ta - tb;
  } else if (ta != null) {
    return -1;
  } else if (tb != null) {
    return 1;
  }
  const pr = prank(a) - prank(b);
  if (pr !== 0) return pr;
  return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
}

export function getSortCompare(state) {
  const sortBy = state?.settings?.sortBy || 'smart';
  if (sortBy === 'dueDate') {
    return (a, b) => {
      const ta = a.dueAt ? new Date(a.dueAt).getTime() : null;
      const tb = b.dueAt ? new Date(b.dueAt).getTime() : null;
      if (ta != null && tb != null) return ta - tb;
      if (ta != null) return -1;
      if (tb != null) return 1;
      const pr = prank(a) - prank(b);
      if (pr !== 0) return pr;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    };
  }
  if (sortBy === 'priority') {
    return (a, b) => {
      const pr = prank(a) - prank(b);
      if (pr !== 0) return pr;
      const ta = a.dueAt ? new Date(a.dueAt).getTime() : null;
      const tb = b.dueAt ? new Date(b.dueAt).getTime() : null;
      if (ta != null && tb != null) return ta - tb;
      if (ta != null) return -1;
      if (tb != null) return 1;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    };
  }
  if (sortBy === 'name') {
    return (a, b) => a.title.localeCompare(b.title);
  }
  if (sortBy === 'createdAt') {
    return (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  }
  return smartCompare;
}

export function activeTasks(state) {
  return state.tasks.filter((t) => !t.isCompleted);
}

export function todayTasks(state) {
  return activeTasks(state)
    .filter((t) => isToday(t.dueAt) || isOverdue(t.dueAt) || (!t.dueAt && isToday(t.createdAt)))
    .sort(getSortCompare(state));
}

export function inboxTasks(state) {
  return activeTasks(state)
    .filter((t) => !t.listId)
    .sort(getSortCompare(state));
}

export function tasksForList(state, listId, { includeDone = true } = {}) {
  const all = state.tasks.filter((t) => t.listId === listId);
  return {
    active: all.filter((t) => !t.isCompleted).sort(getSortCompare(state)),
    done: includeDone
      ? all
          .filter((t) => t.isCompleted)
          .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      : [],
  };
}

export function listSummary(state) {
  return [...state.lists].sort(bySort).map((l) => {
    const tasks = state.tasks.filter((t) => t.listId === l.id);
    return {
      ...l,
      total: tasks.length,
      remaining: tasks.filter((t) => !t.isCompleted).length,
      done: tasks.filter((t) => t.isCompleted).length,
    };
  });
}

// All completed tasks grouped Today / Yesterday / Earlier
export function doneGroups(state) {
  const done = state.tasks
    .filter((t) => t.isCompleted && t.completedAt)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  const today = [];
  const yesterday = [];
  const earlier = [];
  const yDate = addDays(new Date(), -1);
  for (const t of done) {
    if (isToday(t.completedAt)) today.push(t);
    else if (isSameDay(t.completedAt, yDate)) yesterday.push(t);
    else earlier.push(t);
  }
  return { today, yesterday, earlier, total: done.length };
}

export function listName(state, listId) {
  if (!listId) return 'Inbox';
  const l = state.lists.find((x) => x.id === listId);
  return l ? l.name : 'Inbox';
}

export function scheduledTasks(state) {
  return activeTasks(state)
    .filter((t) => {
      if (!t.dueAt) return false;
      const d = new Date(t.dueAt);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const startOfTomorrow = new Date(startOfToday);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
      
      return d.getTime() >= startOfTomorrow.getTime();
    })
    .sort(getSortCompare(state));
}

// Calculate the completion streak (consecutive days of completed tasks ending today or yesterday)
export function calculateStreak(tasks) {
  const completedDates = new Set(
    tasks
      .filter((t) => t.isCompleted && t.completedAt)
      .map((t) => {
        const d = new Date(t.completedAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
  );

  let streak = 0;
  let checkDate = new Date();
  const formatDate = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  // If today has completion, count starting today
  if (completedDates.has(formatDate(checkDate))) {
    while (completedDates.has(formatDate(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  } else {
    // Check if yesterday was completed
    checkDate.setDate(checkDate.getDate() - 1);
    if (completedDates.has(formatDate(checkDate))) {
      while (completedDates.has(formatDate(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
  }
  return streak;
}
