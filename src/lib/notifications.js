import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

export async function scheduleReminder(task) {
  if (Platform.OS === 'web') return null;

  // Cancel any existing scheduled notification for this task first
  await cancelReminder(task.id);

  // If task is completed, we don't schedule any reminders
  if (task.isCompleted) return null;

  // Use reminderAt if set, otherwise fallback to dueAt
  const triggerTimeRaw = task.reminderAt || task.dueAt;
  if (!triggerTimeRaw) return null;

  const triggerTime = new Date(triggerTimeRaw);
  const now = new Date();

  // If trigger time is in the past, do not schedule
  const diffMs = triggerTime.getTime() - now.getTime();
  const seconds = Math.round(diffMs / 1000);
  if (seconds <= 0) return null;

  // Request permissions
  const hasPermission = await requestPermissions();
  if (!hasPermission) return null;

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      identifier: task.id, // Use task ID directly to cancel easily
      content: {
        title: 'HiTasky Reminder',
        body: task.title,
        data: { taskId: task.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
    return identifier;
  } catch (e) {
    console.warn('Failed to schedule notification:', e);
    return null;
  }
}

export async function cancelReminder(taskId) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(taskId);
  } catch (e) {
    // Suppress warning if not scheduled
  }
}
