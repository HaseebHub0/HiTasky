// ============================================================
// Date helpers — all local, no timezone gymnastics, no network.
// Tasks store dueAt / reminderAt as ISO strings (or null).
// ============================================================

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Start of the week (Sunday) at 00:00 — used by weekly recurring resets.
export function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  return addDays(x, -x.getDay());
}

// Mon–Fri?
export function isWeekday(d = new Date()) {
  const day = new Date(d).getDay();
  return day >= 1 && day <= 5;
}

// Short label for a recurring rule.
export function recurringLabel(recurring) {
  if (recurring === 'daily') return 'Daily';
  if (recurring === 'weekly') return 'Weekly';
  if (recurring === 'weekdays') return 'Weekdays';
  return null;
}

// nearest upcoming Saturday (the "This weekend" quick-pick)
export function thisWeekend(from = new Date()) {
  const x = startOfDay(from);
  const day = x.getDay(); // 0 Sun … 6 Sat
  const delta = (6 - day + 7) % 7 || 7; // always move forward to a Saturday
  return addDays(x, delta);
}

export function isSameDay(a, b) {
  if (!a || !b) return false;
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

export function isToday(iso) {
  return isSameDay(iso, new Date());
}

export function isOverdue(iso) {
  if (!iso) return false;
  return new Date(iso).getTime() < startOfDay().getTime();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "Tue · Jun 2" — the header date format used across the design
export function headerDate(d = new Date()) {
  return `${DAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// "9:41 pm"
export function clock(d = new Date()) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

// Human label for a due date, relative where it reads better.
export function dueLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const today = startOfDay();
  const target = startOfDay(d);
  const diff = Math.round((target - today) / 86400000);
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  const time = hasTime ? ' ' + clock(d) : '';

  if (diff === 0) return 'Today' + (hasTime ? ` · ${clock(d)}` : '');
  if (diff === 1) return 'Tomorrow' + time;
  if (diff === -1) return 'Yesterday' + time;
  if (diff < -1) return `${MONTHS[d.getMonth()]} ${d.getDate()}` + time;
  if (diff < 7) return DAYS[d.getDay()] + time;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}` + time;
}

// "Finished 2:04 pm" / "Yesterday" for completed items
export function completedLabel(iso) {
  if (!iso) return 'Done';
  const d = new Date(iso);
  if (isToday(iso)) return clock(d);
  if (isSameDay(iso, addDays(new Date(), -1))) return 'Yesterday';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// split an ISO into the value strings the native date/time inputs want
export function isoToInputs(iso) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time:
      d.getHours() || d.getMinutes() ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '',
  };
}

// recombine date + time inputs into an ISO string (or null)
export function inputsToIso(dateStr, timeStr) {
  if (!dateStr) return null;
  const [y, m, day] = dateStr.split('-').map(Number);
  let hh = 0;
  let mm = 0;
  if (timeStr) {
    [hh, mm] = timeStr.split(':').map(Number);
  }
  return new Date(y, m - 1, day, hh, mm, 0, 0).toISOString();
}
