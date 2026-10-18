/**
 * Pay Our Providers "Join the campaign" -> Airtable, plus zip counts for the map.
 * The Airtable token lives here (in Script Properties), never in the website.
 *
 * Setup (once):
 * 1. Make an Airtable personal access token at airtable.com/create/tokens with scopes
 *    data.records:read and data.records:write, limited to the Child Care Coalition Organizer base.
 * 2. Go to script.google.com > New project, paste this file in.
 * 3. Project Settings (gear) > Script Properties > Add property: AIRTABLE_TOKEN = your token.
 * 4. Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * 5. Send the /exec URL to Claude (or put it in JOIN_URL in pay/index.html).
 *
 * POST: one sign-up, written to the POP Pledge table and tagged with SOURCE.
 * GET:  {"zips": {"11216": 4, ...}, "total": N} for the map. No names, emails or phones leave Airtable.
 */
var BASE = 'appZZI67MRBI5Lgpg';   // Child Care Coalition Organizer
var TABLE = 'tblxmECshBmEhRZku';  // POP Pledge
var SOURCE_FIELD = 'Source';      // single select in POP Pledge; leave '' to skip
var SOURCE = 'Website';
var CACHE_SECONDS = 600;

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.website) return reply_({ ok: true }); // bot trap
    var zip = String(d.zip || '').replace(/\D/g, '');
    if (!d.first_name || !d.last_name || !d.email || zip.length !== 5) return reply_({ ok: false, error: 'missing fields' });

    var f = {
      'Name': clip_(d.first_name), 'Last Name': clip_(d.last_name),
      'Email': clip_(d.email), 'Phone': clip_(d.phone),
      'Zip Code': Number(zip), 'Borough': clip_(d.city),
      'Pledge Date': Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd')
    };
    if (list_(d.organization).length) f['Coalition Organization'] = list_(d.organization);
    if (list_(d.supporter).length) f['Type of Supporter - Select all that apply'] = list_(d.supporter);
    if (list_(d.language).length) f['Language / Idioma'] = list_(d.language);
    if (SOURCE_FIELD) f[SOURCE_FIELD] = SOURCE;

    var res = airtable_('post', '', { records: [{ fields: f }], typecast: true });
    if (res.getResponseCode() >= 300) return reply_({ ok: false, error: 'airtable ' + res.getResponseCode() });
    CacheService.getScriptCache().remove('zips');
    return reply_({ ok: true });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  }
}

function doGet() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('zips');
  if (hit) return reply_(JSON.parse(hit));
  var zips = {}, total = 0, offset = '';
  do {
    var q = '?pageSize=100&fields%5B%5D=' + encodeURIComponent('Zip Code') + (offset ? '&offset=' + offset : '');
    var page = JSON.parse(airtable_('get', q).getContentText());
    (page.records || []).forEach(function (r) {
      var z = String(r.fields['Zip Code'] || '');
      if (/^\d{4}$/.test(z)) z = '0' + z;
      if (/^\d{5}$/.test(z)) { zips[z] = (zips[z] || 0) + 1; total++; }
    });
    offset = page.offset || '';
  } while (offset);
  var out = { zips: zips, total: total, updated: new Date().toISOString() };
  cache.put('zips', JSON.stringify(out), CACHE_SECONDS);
  return reply_(out);
}

function airtable_(method, query, body) {
  var token = PropertiesService.getScriptProperties().getProperty('AIRTABLE_TOKEN');
  var opts = { method: method, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + token } };
  if (body) { opts.contentType = 'application/json'; opts.payload = JSON.stringify(body); }
  return UrlFetchApp.fetch('https://api.airtable.com/v0/' + BASE + '/' + TABLE + query, opts);
}
function list_(v) { return (Array.isArray(v) ? v : v ? [v] : []).map(function (x) { return String(x).slice(0, 200); }).filter(String); } // untrimmed: some Airtable choices end in a space
function clip_(v) { return String(v == null ? '' : v).trim().slice(0, 200); }
function reply_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
