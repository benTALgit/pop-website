// Match a new Registrations or POP Pledge row to one person in Members.
// Email first (ignoring case/spaces), then phone digits. Never overwrites what's on file:
// fills blanks, puts a new phone in Second phone, and flags anything that disagrees.
async function main() {
  const cfg = input.config();
  const isReg = cfg.kind === 'registration';
  const src = base.getTable(isReg ? 'Registrations' : 'POP Pledge');
  const people = base.getTable('Members');
  const F = isReg
    ? { first: 'First name', last: 'Last name', email: 'Email', phone: 'Phone', zip: 'Zip code', link: 'Person' }
    : { first: 'Name', last: 'Last Name', email: 'Email', phone: 'Phone', zip: 'Zip Code', link: 'Members' };
  const rec = await src.selectRecordAsync(cfg.recordId);
  if (!rec || (rec.getCellValue(F.link) || []).length) { output.set('result', 'skipped'); return; }

  const val = (r, f) => (r.getCellValueAsString(f) || '').trim();
  const low = s => s.toLowerCase();
  const digits = p => String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  const first = val(rec, F.first), last = val(rec, F.last), email = low(val(rec, F.email));
  const phone = val(rec, F.phone), zip = val(rec, F.zip).replace(/\D/g, '').slice(0, 5);
  const today = new Date().toISOString().slice(0, 10);

  let langs = [];
  if (isReg) {
    if (rec.getCellValue('Spanish interpretation')) langs.push('Spanish');
  } else {
    langs = (rec.getCellValue('Language / Idioma') || []).map(o => o.name).filter(n => ['English', 'Spanish', 'French', 'Creole', 'Other'].includes(n));
  }

  const q = await people.selectRecordsAsync({ fields: ['First Name', 'Last Name', 'Email', 'Phone', 'Second phone', 'Zip Code', 'Preferred language', 'Review note'] });
  const notes = [];
  let match = null, how = '';
  if (email) { match = q.records.find(r => low(val(r, 'Email')) === email) || null; if (match) how = 'email'; }
  if (!match && digits(phone).length >= 10) {
    const d = digits(phone);
    const hits = q.records.filter(r => digits(val(r, 'Phone')) === d || digits(val(r, 'Second phone')) === d);
    if (hits.length === 1) { match = hits[0]; how = 'phone'; }
    else if (hits.length > 1) notes.push(`Phone matches ${hits.length} people; left unmatched`);
  }

  let personId, status;
  if (match) {
    personId = match.id;
    const upd = {};
    for (const [mine, theirs, label] of [[first, 'First Name', 'first name'], [last, 'Last Name', 'last name']]) {
      if (!mine) continue;
      if (!val(match, theirs)) upd[theirs] = mine;
      else if (low(val(match, theirs)) !== low(mine)) notes.push(`Form ${label} "${mine}" differs from file "${val(match, theirs)}"`);
    }
    if (email && !val(match, 'Email')) upd['Email'] = email;
    else if (how === 'phone' && email && low(val(match, 'Email')) !== email) notes.push(`Matched by phone; form email ${email} differs from file`);
    const d = digits(phone);
    if (d.length >= 10) {
      if (!val(match, 'Phone')) upd['Phone'] = phone;
      else if (d !== digits(val(match, 'Phone')) && d !== digits(val(match, 'Second phone'))) {
        if (!val(match, 'Second phone')) upd['Second phone'] = phone;
        else notes.push(`Another phone number: ${phone}`);
      }
    }
    if (zip.length === 5 && !val(match, 'Zip Code')) upd['Zip Code'] = Number(zip);
    const have = (match.getCellValue('Preferred language') || []).map(o => o.name);
    const add = langs.filter(l => !have.includes(l));
    if (add.length) upd['Preferred language'] = have.concat(add).map(name => ({ name }));
    if (notes.length) {
      upd['Needs review'] = true;
      upd['Review note'] = (val(match, 'Review note') ? val(match, 'Review note') + '\n' : '') + today + ': ' + notes.join('; ');
    }
    if (Object.keys(upd).length) await people.updateRecordAsync(match.id, upd);
    status = notes.length ? 'Needs review' : 'Matched existing person';
  } else {
    if (!email && digits(phone).length < 10) notes.push('No email or phone on the form');
    const dups = first && last ? q.records.filter(r => low(val(r, 'First Name')) === low(first) && low(val(r, 'Last Name')) === low(last)) : [];
    if (dups.length) notes.push(`Same name as ${dups.length} existing person(s); possible duplicate`);
    const f = {
      'First Name': first, 'Last Name': last, 'Email': email, 'Phone': phone,
      'First came in through': { name: isReg ? 'Event registration' : 'Pledge' },
      'Enrollment Date': today,
    };
    for (const k of Object.keys(f)) if (f[k] === '') delete f[k];
    if (zip.length === 5) f['Zip Code'] = Number(zip);
    if (langs.length) f['Preferred language'] = langs.map(name => ({ name }));
    if (notes.length) { f['Needs review'] = true; f['Review note'] = today + ': ' + notes.join('; '); }
    personId = await people.createRecordAsync(f);
    status = notes.length ? 'Needs review' : 'New person created';
  }

  const back = { [F.link]: [{ id: personId }], 'Match': { name: status } };
  if (isReg) back['Match note'] = notes.join('\n');
  await src.updateRecordAsync(rec.id, back);
  output.set('result', status);
}
await main();
