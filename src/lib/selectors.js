// ============================================================
// Derived views over the store. Pure functions — no state.
// ============================================================
import { isToday, isOverdue, isSameDay, addDays } from './date.js';

const bySort = (a, b) => a.sortOrder - b.sortOrder;

export function activeTasks(state) {
  return state.tasks.filter((t) => !t.isCompleted);
}

// "Today" focus view: due today or overdue, plus undated tasks created today.
// The first (lowest sortOrder) becomes the hero "Now" card.
export function todayTasks(state) {
  return activeTasks(state)
    .filter((t) => isToday(t.dueAt) || isOverdue(t.dueAt) || (!t.dueAt && isToday(t.createdAt)))
    .sort(bySort);
}

export function inboxTasks(state) {
  return activeTasks(state)
    .filter((t) => !t.listId)
    .sort(bySort);
}

export function tasksForList(state, listId, { includeDone = true } = {}) {
  const all = state.tasks.filter((t) => t.listId === listId);
  return {
    active: all.filter((t) => !t.isCompleted).sort(bySort),
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
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
}
