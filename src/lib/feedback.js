// ============================================================
// Haptics — "haptics as a language" (PRD §4.3), via expo-haptics.
// Gated behind the settings toggle; degrade silently.
// (A subtle completion sound is out of scope for the mobile MVP —
//  the haptic tick is the signature confirmation.)
// ============================================================
import * as Haptics from 'expo-haptics';

export function completionFeedback(settings) {
  if (settings && settings.haptics === false) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function softFeedback(settings) {
  if (settings && settings.haptics === false) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function selectionFeedback(settings) {
  if (settings && settings.haptics === false) return;
  Haptics.selectionAsync().catch(() => {});
}
