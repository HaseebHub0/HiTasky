# Feedback → Google Sheet setup

HiTasky has no backend, so in-app feedback is appended to a Google Sheet through
a **Google Apps Script Web App**. One-time setup, ~3 minutes.

## 1. Create the Sheet
1. Go to <https://sheets.google.com> → **Blank spreadsheet**.
2. Name it e.g. `HiTasky Feedback`.
3. In row 1, add headers (optional — the script writes them for you on first run):

   | Timestamp | Mood | Comment | Date | Version | Platform | Theme |
   |-----------|------|---------|------|---------|----------|-------|

## 2. Add the Apps Script
1. In the Sheet: **Extensions → Apps Script**.
2. Delete any boilerplate and paste this:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // Write a header row once.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Mood', 'Comment', 'Date', 'Version', 'Platform', 'Theme']);
    }

    var data = {};
    try { data = JSON.parse(e.postData.contents); } catch (err) { data = {}; }

    sheet.appendRow([
      new Date(),
      data.mood || '',
      data.comment || '',
      data.date || '',
      data.version || '',
      data.platform || '',
      data.theme || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Lets you sanity-check the URL in a browser.
function doGet() {
  return ContentService.createTextOutput('HiTasky feedback endpoint is live.');
}
```

## 3. Deploy
1. **Deploy → New deployment**.
2. Gear icon → **Web app**.
3. Settings:
   - **Execute as:** Me
   - **Who has access:** **Anyone**
4. **Deploy**, authorize when prompted (Advanced → Go to project → Allow).
5. Copy the **Web app URL** (ends in `/exec`).

## 4. Plug it into the app
Open `src/lib/feedbackSheet.js` and paste the URL:

```javascript
export const FEEDBACK_ENDPOINT = 'https://script.google.com/macros/s/AKfy.../exec';
```

That's it. Submitting feedback in **Settings → Share your feedback** now appends a
row to your Sheet. If the endpoint is empty or the network is down, feedback is
still saved locally on the device (and the user is told so) — nothing is lost.

## Notes
- The request is sent as `text/plain` JSON on purpose, so Apps Script accepts it
  without a CORS preflight.
- To update the script later, use **Deploy → Manage deployments → Edit** and keep
  the same deployment so the URL doesn't change.
