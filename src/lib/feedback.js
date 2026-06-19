import * as Haptics from 'expo-haptics';

export function completionFeedback(settings) {
  if (!settings || settings.haptics !== false) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}

export function softFeedback(settings) {
  if (settings && settings.haptics === false) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function selectionFeedback(settings) {
  if (settings && settings.haptics === false) return;
  Haptics.selectionAsync().catch(() => {});
}

export function addFeedback(settings) {
  if (settings && settings.haptics === false) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function deleteFeedback(settings) {
  if (settings && settings.haptics === false) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

