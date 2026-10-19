/**
 * POP website forms -> the "Dec 2 POP Launch Registration" Google Sheet, one tab per form.
 * Used until the site's Airtable key is working; then the forms move to Airtable.
 *
 *   Dec 2 registration (popchildcare.org/dec2)       -> tab "Registrations" (unchanged)
 *   Campaign pledge ("Join us" on /campaign)         -> tab "Pledges"
 *   Endorsement (/pay/endorse), logo saved to Drive  -> tab "Endorsements"
 *
 * Update (once): in the sheet, Extensions > Apps Script, replace all the code with this file and save.
 * Then Deploy > Manage deployments > pencil icon > Version: New version > Deploy, and approve the
 * new Drive permission (for endorser logos). Editing the existing deployment keeps the same /exec URL.
 */
var FORMS = {
  registration: {
    sheet: 'Registrations',
    columns: ['submitted_at', 'site', 'first_name', 'last_name', 'phone', 'email',
      'role', 'organization', 'zip', 'adults', 'kids', 'wheelchair_access',
      'spanish_interpretation', 'notes', 'form_language']
  },
  pledge: {
    sheet: 'Pledges',
    columns: ['submitted_at', 'first_name', 'last_name', 'email', 'phone', 'zip',
      'supporter', 'language', 'page']
  },
  endorse: {
    sheet: 'Endorsements',
    columns: ['submitted_at', 'organization', 'org_website', 'mission', 'first_name', 'last_name',
      'role', 'email', 'phone', 'authorized', 'logo_file', 'status']
  }
};
var LOGO_FOLDER = 'Pay Our Providers endorser logos';
var LOGO_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp' };

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.website) return reply_({ ok: true }); // bot trap
    var form = FORMS[d.form] || FORMS.registration; // the Dec 2 form sends no "form" field
    if (!d.submitted_at) d.submitted_at = new Date().toISOString();
    if (d.form === 'endorse') {
      if (!d.authorized) return reply_({ ok: false, error: 'not authorized' });
      saveLogo_(d);
      d.status = 'new';
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(form.sheet) || ss.insertSheet(form.sheet);
    // Keep the header row in step with the columns.
    sh.getRange(1, 1, 1, form.columns.length).setValues([form.columns]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.appendRow(form.columns.map(function (c) { return cell_(d[c]); }));
    return reply_({ ok: true });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function cell_(v) {
  if (Array.isArray(v)) v = v.map(function (x) { return String(x).trim(); }).join('; ');
  if (typeof v === 'boolean') v = v ? 'yes' : 'no';
  if (v == null) v = '';
  v = String(v).slice(0, 2000);
  // Keep spreadsheet formulas from running if someone types one in a field.
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function saveLogo_(d) {
  var logo = d.logo;
  if (!logo || !logo.data || !LOGO_TYPES[logo.type]) return;
  var bytes = Utilities.base64Decode(logo.data);
  if (bytes.length > 5 * 1024 * 1024) return;
  var name = String(d.organization || 'logo').replace(/[^\w\- ]+/g, '').trim().slice(0, 80) || 'logo';
  var it = DriveApp.getFoldersByName(LOGO_FOLDER);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(LOGO_FOLDER);
  d.logo_file = folder.createFile(Utilities.newBlob(bytes, logo.type, name + '.' + LOGO_TYPES[logo.type])).getUrl();
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
