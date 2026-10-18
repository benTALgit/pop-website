/**
 * Pay Our Providers endorsements -> Google Sheet, with logos saved to Google Drive.
 *
 * Setup (once):
 * 1. Make a Google Sheet for endorsements and open Extensions > Apps Script.
 * 2. Paste this file in, then Deploy > New deployment > Web app
 *    (Execute as: Me, Who has access: Anyone). Approve the Drive and Sheets permissions.
 * 3. Put the /exec URL into SUBMIT_URL in pay/endorse/index.html.
 *
 * Logos go into a Drive folder named LOGO_FOLDER (created on first use, private to you);
 * the sheet gets a link to each file.
 */
var SHEET_NAME = 'Endorsements';
var LOGO_FOLDER = 'Pay Our Providers endorser logos';
var NOTIFY = ''; // Optional: an email address to notify on each endorsement.
var COLUMNS = [
  'submitted_at', 'organization', 'org_website', 'mission', 'first_name', 'last_name',
  'role', 'email', 'phone', 'authorized', 'logo_file', 'status'
];
var TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp' };

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.website) return reply_({ ok: true }); // bot trap
    if (!d.authorized) return reply_({ ok: false, error: 'not authorized' });

    if (d.logo && d.logo.data && TYPES[d.logo.type]) {
      var bytes = Utilities.base64Decode(d.logo.data);
      if (bytes.length <= 5 * 1024 * 1024) {
        var name = String(d.organization || 'logo').replace(/[^\w\- ]+/g, '').trim().slice(0, 80) || 'logo';
        var file = folder_().createFile(Utilities.newBlob(bytes, d.logo.type, name + '.' + TYPES[d.logo.type]));
        d.logo_file = file.getUrl();
      }
    }
    d.status = 'new';

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    var row = COLUMNS.map(function (c) {
      var v = d[c];
      if (typeof v === 'boolean') v = v ? 'yes' : 'no';
      if (v == null) v = '';
      v = String(v).slice(0, 2000);
      // Keep spreadsheet formulas from running if someone types one in a field.
      return /^[=+\-@]/.test(v) ? "'" + v : v;
    });
    sh.appendRow(row);

    if (NOTIFY) {
      MailApp.sendEmail(NOTIFY, 'New Pay Our Providers endorsement: ' + d.organization,
        d.organization + ' (' + d.org_website + ')\n' + d.first_name + ' ' + d.last_name + ', ' + d.role +
        '\n' + d.email + ' ' + (d.phone || '') + '\n\n' + d.mission + '\n\nLogo: ' + (d.logo_file || 'none') +
        '\nSheet: ' + ss.getUrl());
    }
    return reply_({ ok: true });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function folder_() {
  var it = DriveApp.getFoldersByName(LOGO_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(LOGO_FOLDER);
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
