/**
 * HiTasky — "Founders' 40" early-access counter (Google Apps Script).
 *
 * Hands out the next slot number atomically. First `limit` installs are
 * founders (free lifetime Pro). Dedupes by installId so a re-open of the
 * same install keeps the same rank.
 *
 * DEPLOY:
 *   1. script.google.com → New project → paste this whole file.
 *   2. Deploy → New deployment → type "Web app".
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   3. Authorize, then copy the Web app URL ending in /exec.
 *   4. Paste that URL into mobile/src/lib/config.js → EARLY_ACCESS_URL.
 *
 * TEST (optional): visit the /exec URL in a browser → doGet shows the
 * current count without consuming a slot.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(8000); // block concurrent installs so the count is exact
  try {
    var body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (_) {}
    var limit = Number(body.limit) || 40;
    var installId = String(body.installId || '');
    var props = PropertiesService.getScriptProperties();

    var rank;
    var existing = installId ? props.getProperty('id_' + installId) : null;
    if (existing) {
      rank = Number(existing); // same install → same slot (no double count)
    } else {
      var count = Number(props.getProperty('count') || '0') + 1;
      props.setProperty('count', String(count));
      // Only remember founders (keeps storage tiny once the promo is over).
      if (installId && count <= limit) props.setProperty('id_' + installId, String(count));
      rank = count;
    }

    return json({ rank: rank, founder: rank <= limit, limit: limit });
  } finally {
    lock.releaseLock();
  }
}

// Read-only peek (does NOT consume a slot).
function doGet() {
  var props = PropertiesService.getScriptProperties();
  var count = Number(props.getProperty('count') || '0');
  return json({ claimed: count, founder_limit: 40, left: Math.max(0, 40 - count) });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
