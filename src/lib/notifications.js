// ============================================================
// HiTasky — Bulletproof Local Reminders.
//
// Uses expo-notifications with DATE-based triggers, which map
// to Android's setExactAndAllowWhileIdle under the hood for
// precise alarm delivery. No server, no network, fully offline.
//
// Key reliability features:
//   • DATE triggers (not TIME_INTERVAL) — no drift when backgrounded
//   • rescheduleAllReminders() — restores alarms after reboot / import
//   • Graceful degradation on permission denial
//   • Deduplication by task ID (each task gets exactly one alarm)
// ============================================================
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isToday, isOverdue } from './date.js';

// Set notification handler — controls how notifications appear
// when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const REMINDER_CATEGORY = 'reminder_actions';

/**
 * Register notification actions category.
 */
export async function registerNotificationCategories() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
      {
        identifier: 'complete_action',
        buttonTitle: '✅ Complete Task',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'snooze_action',
        buttonTitle: '⏰ Snooze (1 hr)',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  } catch (e) {
    console.warn('[Notifications] Failed to set notification category:', e.message);
  }
}

/**
 * Request notification permissions. Must be called before scheduling.
 * Returns true if permission is granted.
 */
export async function requestPermissions() {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Schedule a local reminder for a task using an exact DATE trigger.
 *
 * This maps to Android's setExactAndAllowWhileIdle, ensuring the
 * alarm fires precisely even in Doze mode. Unlike TIME_INTERVAL
 * triggers, DATE triggers don't drift when the app is backgrounded.
 *
 * @param {Object} task — must have { id, title, dueAt?, reminderAt? }
 * @returns {string|null} — the notification identifier, or null
 */
export async function scheduleReminder(task) {
  if (Platform.OS === 'web') return null;

  // Cancel any existing notification for this task first
  await cancelReminder(task.id);

  // Don't schedule for completed tasks
  if (task.isCompleted) return null;

  // Use reminderAt if set, otherwise fallback to dueAt
  const triggerTimeRaw = task.reminderAt || task.dueAt;
  if (!triggerTimeRaw) return null;

  const triggerTime = new Date(triggerTimeRaw);
  const now = new Date();

  // If trigger time is in the past, do not schedule
  if (triggerTime.getTime() <= now.getTime()) return null;

  // Request permissions
  const hasPermission = await requestPermissions();
  if (!hasPermission) return null;

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      identifier: task.id, // Use task ID directly — ensures 1:1 mapping
      content: {
        title: 'HiTasky Reminder',
        body: task.title,
        data: { taskId: task.id },
        sound: true,
        categoryIdentifier: REMINDER_CATEGORY,
      },
      trigger: {
        // DATE trigger — fires at the exact specified time.
        // Expo maps this to AlarmManager.setExactAndAllowWhileIdle
        // on Android, giving reliable delivery even in Doze mode.
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
      },
    });
    return identifier;
  } catch (e) {
    // Some devices/OS versions may reject exact alarms. Fall back
    // to a TIME_INTERVAL trigger as a best-effort backup.
    console.warn('[Notifications] DATE trigger failed, trying TIME_INTERVAL:', e.message);
    try {
      const diffMs = triggerTime.getTime() - Date.now();
      const seconds = Math.max(1, Math.round(diffMs / 1000));
      const identifier = await Notifications.scheduleNotificationAsync({
        identifier: task.id,
        content: {
          title: 'HiTasky Reminder',
          body: task.title,
          data: { taskId: task.id },
          sound: true,
          categoryIdentifier: REMINDER_CATEGORY,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: false,
        },
      });
      return identifier;
    } catch (fallbackError) {
      console.warn('[Notifications] All trigger types failed:', fallbackError.message);
      return null;
    }
  }
}

/**
 * Cancel a scheduled reminder for a given task ID.
 */
export async function cancelReminder(taskId) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(taskId);
  } catch (e) {
    // Suppress — notification may not exist
  }
}

/**
 * Reschedule ALL active reminders from the current state.
 *
 * Called on:
 *   • App launch (HYDRATE) — restores alarms after reboot
 *   • Data import (IMPORT) — ensures imported reminders are active
 *   • App foregrounding — catches any alarms cleared by the OS
 *
 * This is the "boot-completed" equivalent for Expo: since we can't
 * register a native BroadcastReceiver, we restore all alarms every
 * time the app opens. DATE triggers make this safe and precise.
 */
export async function rescheduleAllReminders(tasks) {
  if (Platform.OS === 'web') return;
  if (!tasks || !Array.isArray(tasks)) return;

  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  // Cancel all existing HiTasky notifications first to avoid duplicates
  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of existing) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  } catch (e) {
    // Non-fatal — proceed with scheduling
  }

  // Re-schedule every active task that has a future reminder/due time
  const now = new Date();
  let scheduled = 0;

  for (const task of tasks) {
    if (task.isCompleted) continue;

    const triggerTimeRaw = task.reminderAt || task.dueAt;
    if (!triggerTimeRaw) continue;

    const triggerTime = new Date(triggerTimeRaw);
    if (triggerTime.getTime() <= now.getTime()) continue;

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: task.id,
        content: {
          title: 'HiTasky Reminder',
          body: task.title,
          data: { taskId: task.id },
          sound: true,
          categoryIdentifier: REMINDER_CATEGORY,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
        },
      });
      scheduled++;
    } catch (e) {
      // Individual failure — continue with remaining tasks
      console.warn(`[Notifications] Failed to reschedule "${task.title}":`, e.message);
    }
  }

  if (scheduled > 0) {
    console.log(`[Notifications] Rescheduled ${scheduled} reminder(s)`);
  }
}

function calculateStreak(tasks) {
  const completedDates = new Set(
    (tasks || [])
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

export async function scheduleMorningDigest(tasks) {
  if (Platform.OS === 'web') return;

  const identifier = 'morning_digest';
  try {
    // Cancel the existing morning digest notification first to avoid duplicates
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (e) {
    // ignore
  }

  // Request permissions
  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  const now = new Date();
  const triggerTime = new Date(now);
  // Always schedule for tomorrow at 8:00 AM to ensure that if the app is
  // opened before 8 AM today, today's notification is skipped.
  triggerTime.setDate(triggerTime.getDate() + 1);
  triggerTime.setHours(8, 0, 0, 0);

  const streak = calculateStreak(tasks);
  
  // Only warn if they actually have a streak to lose
  let body = '';
  if (streak > 0) {
    body = `Quick, open the app! Don't let your ${streak}-day streak break. 🔥`;
  } else {
    body = `Start your morning strong. Build your streak today! 🔥`;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: 'HiTasky',
        body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
      },
    });
    console.log(`[Notifications] Morning digest scheduled for ${triggerTime.toISOString()}`);
  } catch (e) {
    console.warn('[Notifications] Failed to schedule morning digest:', e.message);
  }
}

/**
 * Listen to rich notification action taps (Complete / Snooze).
 */
export function registerNotificationResponseListener(actions, showToast) {
  if (Platform.OS === 'web') return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
    const actionId = response.actionIdentifier;
    const taskId = response.notification.request.content.data?.taskId;

    if (!taskId) return;

    if (actionId === 'complete_action') {
      try {
        actions.toggleTask(taskId, true);
        if (showToast) showToast('Task completed!');
      } catch (e) {
        console.warn('[Notifications Response] Complete action failed:', e);
      }
    } else if (actionId === 'snooze_action') {
      try {
        const now = new Date();
        const snoozeTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later
        actions.updateTask(taskId, { reminderAt: snoozeTime.toISOString() });
        if (showToast) showToast('Snoozed for 1 hour!');
      } catch (e) {
        console.warn('[Notifications Response] Snooze action failed:', e);
      }
    }
  });

  return () => subscription.remove();
}
