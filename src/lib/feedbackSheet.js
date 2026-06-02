// ============================================================
// Feedback → Google Sheet (via a Google Apps Script Web App).
//
// HiTasky is offline-first with no backend, so feedback is sent
// directly to a Google Apps Script endpoint that appends a row to
// your Sheet. Setup steps + the script live in GOOGLE_SHEET_SETUP.md.
//
// 1. Deploy the Apps Script web app (Execute as: Me, Access: Anyone).
// 2. Paste the /exec URL below.
// Until then, FEEDBACK_ENDPOINT stays empty and feedback is kept
// locally (the caller still stores it in AsyncStorage as a fallback).
// ============================================================

// 👉 Paste your Apps Script Web App URL here (ends with /exec)
export const FEEDBACK_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxOUzcrBweMxdRpNrAtE-kbhWHGkmFXpncd8MlTqTUGLd8pCu4TbrJAQFRtty_5EEZ9/exec';

export function isSheetConfigured() {
  return typeof FEEDBACK_ENDPOINT === 'string' && FEEDBACK_ENDPOINT.startsWith('http');
}

/**
 * POST a feedback row to the Google Sheet.
 * Resolves { ok: true } on success, throws on network/endpoint error.
 *
 * Note: Apps Script web apps 302-redirect to a script.googleusercontent.com
 * URL. We send a simple (text/plain) body to avoid a CORS preflight, and
 * fetch follows the redirect automatically on React Native.
 *
 * @param {{mood:string, comment:string, date?:string}} item
 * @param {object} [meta] optional extra fields (version, platform, theme…)
 */
export async function submitFeedbackToSheet(item, meta = {}) {
  if (!isSheetConfigured()) {
    return { ok: false, skipped: true };
  }

  const payload = {
    mood: item.mood,
    comment: item.comment,
    date: item.date || new Date().toISOString(),
    ...meta,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(FEEDBACK_ENDPOINT, {
      method: 'POST',
      // text/plain → "simple request", no CORS preflight against Apps Script
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error('Sheet responded ' + res.status);
    return { ok: true };
  } finally {
    clearTimeout(timeout);
  }
}
