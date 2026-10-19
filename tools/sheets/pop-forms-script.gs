/**
 * POP website forms -> the "Dec 2 POP Launch Registration" Google Sheet, one tab per form.
 * Used until the site's Airtable key is working; then the forms move to Airtable.
 *
 *   Dec 2 registration (popchildcare.org/dec2)       -> tab "Registrations" (unchanged)
 *   Campaign pledge ("Join us" on /campaign)         -> tab "Pledges"
 *   Endorsement (/pay/endorse), logo saved to Drive  -> tab "Endorsements"
 *
 * Update (once): in the sheet, Extensions > Apps Script, replace all the code with this file and save.
 * Permissions are kept narrow in appsscript.json (Project Settings > "Show appsscript.json"):
 *   "oauthScopes": ["https://www.googleapis.com/auth/spreadsheets.currentonly",
 *                   "https://www.googleapis.com/auth/drive.file",
 *                   "https://www.googleapis.com/auth/script.external_request"]
 * i.e. only this spreadsheet, and only Drive files this script creates (the endorser logo folder).
 * Run authorizeDrive once, then Deploy > Manage deployments > pencil icon > Version: New version > Deploy.
 * Editing the existing deployment keeps the same /exec URL.
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

// Logos go through the Drive API with the narrow drive.file scope (set in appsscript.json), so the
// script can only see the folder and files it creates itself, not the rest of your Drive.
function saveLogo_(d) {
  var logo = d.logo;
  if (!logo || !logo.data || !LOGO_TYPES[logo.type]) return;
  var bytes = Utilities.base64Decode(logo.data);
  if (bytes.length > 5 * 1024 * 1024) return;
  var name = String(d.organization || 'logo').replace(/[^\w\- ]+/g, '').trim().slice(0, 80) || 'logo';
  // One multipart upload: the file's name and folder, then its bytes.
  var b = 'pop' + Date.now();
  var meta = JSON.stringify({ name: name + '.' + LOGO_TYPES[logo.type], parents: [logoFolderId_()] });
  var body = Utilities.newBlob('--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta
    + '\r\n--' + b + '\r\nContent-Type: ' + logo.type + '\r\n\r\n').getBytes()
    .concat(bytes, Utilities.newBlob('\r\n--' + b + '--').getBytes());
  d.logo_file = drive_('post', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=webViewLink',
    'multipart/related; boundary=' + b, body).webViewLink;
}

function logoFolderId_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('LOGO_FOLDER_ID');
  if (id) return id;
  id = drive_('post', 'https://www.googleapis.com/drive/v3/files?fields=id', 'application/json',
    JSON.stringify({ name: LOGO_FOLDER, mimeType: 'application/vnd.google-apps.folder' })).id;
  props.setProperty('LOGO_FOLDER_ID', id);
  return id;
}

function drive_(method, url, contentType, payload) {
  var r = UrlFetchApp.fetch(url, { method: method, contentType: contentType, payload: payload, muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
  if (r.getResponseCode() >= 300) throw new Error('Drive ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
  return JSON.parse(r.getContentText());
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Run once from the Apps Script editor (choose it in the function menu, then Run) to approve the
// permissions. Then deploy a new version.
function authorizeDrive() {
  logoFolderId_();
}
