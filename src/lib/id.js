// Tiny collision-resistant id. crypto.randomUUID when available, else a
// timestamp+random fallback so the app still works in older webviews offline.
export function uid(prefix = '') {
  let core;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    core = crypto.randomUUID();
  } else {
    core = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  return prefix ? prefix + '_' + core : core;
}
