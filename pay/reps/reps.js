// "Are your reps supporting POP?" — address lookup on /campaign/ (#your-reps), English and Spanish.
// 1. Address -> districts: GET /api/reps/lookup on popchildcare.org (US Census geocoder), then the NYC Council
//    district from NYC Planning's council map (in NYC only).
// 2. Officials, their emails and champion status come from the Airtable "Elected Officials" table (GET /api/reps/officials),
//    so staff can add or fix emails there. officials.js (tools/reps/build-officials.py) is the backup if that call fails.
// 3. Thank / ask: opens the person's own email app (or Gmail) prefilled to every address we have for that rep;
//    reps with no public email get "copy the message + open their contact form", plus a phone number.
//    Every send is logged to Airtable "Rep Messages" (POST /api/rep-message). Logging never blocks the send.
(function () {
  var root = document.getElementById('your-reps');
  if (!root || !window.POP_OFFICIALS) return;
  var D = window.POP_OFFICIALS;
  var OWN = /(^|\.)(popny|popchildcare)\.org$/.test(location.hostname);
  var API = OWN ? 'https://popchildcare.org' : (window.POP_REPS_API || '');
  var COUNCIL_URL = 'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/NYC_City_Council_Districts/FeatureServer/0/query';
  var NYC = { '005': 'Bronx', '047': 'Brooklyn', '061': 'Manhattan', '081': 'Queens', '085': 'Staten Island' };
  var SIGN_ON = 'https://popchildcare.org/campaign/#sign-on';
  var DEC2_OVER = new Date('2026-12-03T05:00:00Z'); // after Dec 2 (ET) the letters stop mentioning the launch

  var T = {
    en: {
      eyebrow: 'Look up your elected officials', title: 'Are your reps supporting POP?',
      intro: 'Enter your home address to see who represents you, and whether they’ve signed on as a Pay Our Providers champion. Then thank them, or ask them to sign on.',
      addrLabel: 'Your home address', addrPh: 'Street address, city, zip', find: 'Find my reps', finding: 'Looking up your districts…',
      notFound: 'We couldn’t find that address. Try your street number, street, city and zip code, like “123 Main St, Brooklyn, NY 11201”.',
      notNY: 'That address is outside New York State. This lookup covers New York elected officials.',
      err: 'The address lookup isn’t answering right now. Please try again in a minute.',
      matched: 'Showing elected officials for', of: 'of', support: 'of your elected officials have signed on as POP champions.',
      yes: 'Signed on as a POP champion', no: 'Hasn’t signed on yet', vacant: 'This seat is vacant right now.',
      thank: 'Say thank you', ask: 'Ask them to sign on', contacts: 'How to reach them',
      email: 'Email', call: 'Call', site: 'Website', form: 'Contact form',
      ph: { district: 'district office', albany: 'Albany office', dc: 'Washington office', office: 'office' },
      offices: {
        council: 'NYC Council', assembly: 'State Assembly', senate: 'State Senate', house: 'U.S. House', ussenate: 'U.S. Senate',
        bp: 'Borough President', mayor: 'Mayor of New York City', pa: 'NYC Public Advocate', comptroller: 'NYC Comptroller',
      },
      district: 'District', groups: { mine: 'Your district representatives', also: 'Also representing you' },
      councilMiss: 'We couldn’t find your Council district from this address.', councilFind: 'Find your Council Member',
      nycOnly: 'City Council and citywide offices are shown for New York City addresses.',
      // composer
      to: 'To', yourName: 'Your name', yourEmail: 'Your email (optional)', keep: 'Keep me posted about Pay Our Providers',
      letterLang: 'Letter in', msg: 'Your message (you can edit it)', subject: 'Subject',
      openEmail: 'Open in my email', gmail: 'Use Gmail instead', copyForm: 'Copy message & open their contact form',
      copy: 'Copy message', copied: 'Copied!', callIt: 'Call their office', close: 'Close', needName: 'Please add your name so they know who it’s from.',
      noEmail: 'This office doesn’t list a public email, so send your message through their contact form, or call.',
      senNote: 'The State Senate form asks you to make a free nysenate.gov account first.',
      script: 'On the phone: “Hi, I’m a constituent. I’m calling to ask {who} to sign on as a champion of Pay Our Providers, the child care providers’ campaign for fair pay.”',
      scriptThanks: 'On the phone: “Hi, I’m a constituent. I’m calling to thank {who} for standing with child care providers as a Pay Our Providers champion.”',
      done: 'Thank you! Did your email open? If not, use “Copy message” and paste it into a new email to the addresses above.',
      doneForm: 'Your message is copied. Paste it into their contact form in the new tab.',
    },
    es: {
      eyebrow: 'Busque a sus representantes', title: '¿Sus representantes apoyan a POP?',
      intro: 'Escriba la dirección de su casa para ver quiénes le representan y si ya se sumaron como campeones de Pay Our Providers. Luego, déles las gracias o pídales que se sumen.',
      addrLabel: 'La dirección de su casa', addrPh: 'Calle y número, ciudad, código postal', find: 'Buscar', finding: 'Buscando sus distritos…',
      notFound: 'No encontramos esa dirección. Escriba el número, la calle, la ciudad y el código postal, por ejemplo “123 Main St, Brooklyn, NY 11201”.',
      notNY: 'Esa dirección está fuera del Estado de Nueva York. Esta búsqueda incluye a funcionarios electos de Nueva York.',
      err: 'La búsqueda de direcciones no responde en este momento. Inténtelo de nuevo en un minuto.',
      matched: 'Funcionarios electos para', of: 'de', support: 'de sus funcionarios electos se sumaron como campeones de POP.',
      yes: 'Se sumó como campeón de POP', no: 'Todavía no se ha sumado', vacant: 'Este puesto está vacante por ahora.',
      thank: 'Dar las gracias', ask: 'Pedir que se sume', contacts: 'Cómo comunicarse',
      email: 'Correo', call: 'Llamar', site: 'Sitio web', form: 'Formulario de contacto',
      ph: { district: 'oficina del distrito', albany: 'oficina en Albany', dc: 'oficina en Washington', office: 'oficina' },
      offices: {
        council: 'Concejo Municipal de NYC', assembly: 'Asamblea Estatal', senate: 'Senado Estatal', house: 'Cámara de Representantes de EE. UU.', ussenate: 'Senado de EE. UU.',
        bp: 'Presidencia del condado', mayor: 'Alcaldía de la Ciudad de Nueva York', pa: 'Defensor del Pueblo de NYC', comptroller: 'Contralor de NYC',
      },
      district: 'Distrito', groups: { mine: 'Sus representantes de distrito', also: 'Tambi\u00e9n le representan' },
      councilMiss: 'No encontramos su distrito del Concejo con esta dirección.', councilFind: 'Busque a su concejal',
      nycOnly: 'El Concejo Municipal y los cargos de la ciudad aparecen para direcciones en la Ciudad de Nueva York.',
      to: 'Para', yourName: 'Su nombre', yourEmail: 'Su correo (opcional)', keep: 'Quiero recibir noticias de Pay Our Providers',
      letterLang: 'Carta en', msg: 'Su mensaje (puede editarlo)', subject: 'Asunto',
      openEmail: 'Abrir en mi correo', gmail: 'Usar Gmail', copyForm: 'Copiar el mensaje y abrir su formulario',
      copy: 'Copiar el mensaje', copied: '¡Copiado!', callIt: 'Llamar a su oficina', close: 'Cerrar', needName: 'Escriba su nombre para que sepan quién escribe.',
      noEmail: 'Esta oficina no publica un correo, así que envíe su mensaje por su formulario de contacto, o llame.',
      senNote: 'El formulario del Senado Estatal pide crear primero una cuenta gratis en nysenate.gov.',
      script: 'Por teléfono: “Hola, vivo en su distrito. Llamo para pedirle a {who} que se sume como campeón de Pay Our Providers, la campaña de las proveedoras de cuidado infantil por un pago justo.”',
      scriptThanks: 'Por teléfono: “Hola, vivo en su distrito. Llamo para agradecerle a {who} por apoyar a las proveedoras de cuidado infantil como campeón de Pay Our Providers.”',
      done: '¡Gracias! ¿Se abrió su correo? Si no, use “Copiar el mensaje” y péguelo en un correo nuevo a las direcciones de arriba.',
      doneForm: 'Su mensaje está copiado. Péguelo en el formulario de contacto que se abrió.',
    },
  };

  // Titles used in the letters
  var TITLE = {
    en: { council: 'Council Member', assembly: 'Assembly Member', senate: 'Senator', house: 'Representative', ussenate: 'Senator',
          bp: 'Borough President', mayor: 'Mayor', pa: 'Public Advocate', comptroller: 'Comptroller' },
    es: { council: 'concejal', assembly: 'asambleísta', senate: 'senador(a) estatal', house: 'representante', ussenate: 'senador(a)',
          bp: 'presidente(a) del condado', mayor: 'alcalde', pa: 'defensor del pueblo', comptroller: 'contralor' },
  };
  // Airtable "Office" choices
  var OFFICE_AT = { council: 'NYC Council', assembly: 'State Assembly', senate: 'State Senate', house: 'US House', ussenate: 'US Senate',
                    bp: 'Borough President', mayor: 'Mayor', pa: 'Public Advocate', comptroller: 'Comptroller' };

  var lang = 'en', last = null, place = null;
  function t(k) { return T[lang][k]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lastName(n) { var p = n.replace(/,?\s+(Jr\.?|Sr\.?|II|III|IV|R\.N\.)$/i, '').trim().split(/\s+/); return p[p.length - 1]; }

  /* ---------- static text ---------- */
  function paintStatic() {
    root.lang = lang;
    Array.prototype.forEach.call(root.querySelectorAll('[data-r]'), function (el) { el.textContent = t(el.getAttribute('data-r')); });
    var inp = root.querySelector('input[name=address]'); if (inp) inp.placeholder = t('addrPh');
    Array.prototype.forEach.call(root.querySelectorAll('.reps-lang button'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
    if (last) render(last);
  }
  Array.prototype.forEach.call(root.querySelectorAll('.reps-lang button'), function (b) {
    b.addEventListener('click', function () { lang = b.getAttribute('data-lang'); paintStatic(); });
  });
  if (/^es\b/i.test(navigator.language || '') ) lang = 'es';

  /* ---------- lookup ---------- */
  var form = root.querySelector('.reps-form'), status = root.querySelector('.reps-status'), out = root.querySelector('.reps-results');
  function say(msg, bad) { status.textContent = msg || ''; status.classList.toggle('bad', !!bad); }

  function getJSON(url, ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = ctl && setTimeout(function () { ctl.abort(); }, ms || 25000);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }
  function councilFor(lat, lng) {
    var q = '?geometry=' + lng + ',' + lat + '&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=CounDist&returnGeometry=false&f=json';
    return getJSON(COUNCIL_URL + q, 12000).then(function (j) {
      var f = j && j.features && j.features[0]; return f ? +f.attributes.CounDist : null;
    }).catch(function () { return null; });
  }

  // Live list from Airtable; keep the bundled copy if it is slow or fails.
  var liveOfficials = (window.POP_REPS_MOCK || !API) ? Promise.resolve() :
    getJSON(API + '/api/reps/officials', 8000).then(function (j) {
      if (j && j.ok && j.assembly && Object.keys(j.assembly).length > 100) D = j;
    }).catch(function () {});

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var addr = form.elements.address.value.trim();
    if (addr.length < 5) { say(t('notFound'), true); form.elements.address.focus(); return; }
    var btn = form.querySelector('button'); btn.disabled = true;
    say(t('finding')); out.hidden = true;
    var lookup = window.POP_REPS_MOCK ? Promise.resolve(window.POP_REPS_MOCK(addr)) : getJSON(API + '/api/reps/lookup?address=' + encodeURIComponent(addr));
    Promise.all([lookup, liveOfficials]).then(function (res) {
      var g = res[0];
      if (!g || !g.ok) throw new Error('lookup');
      if (!g.found) { say(t('notFound'), true); return; }
      if (g.state && g.state !== 'NY') { say(t('notNY'), true); return; }
      var inNYC = !!NYC[g.countyFips];
      return (inNYC && g.lat != null ? councilFor(g.lat, g.lng) : Promise.resolve(null)).then(function (cd) {
        place = { matched: g.matched, zip: g.zip, nyc: inNYC, county: g.countyFips, cd: g.cd, sd: g.sd, ad: g.ad, council: cd };
        last = place; say(''); render(place);
        out.hidden = false;
        var h = out.querySelector('.reps-matched'); if (h) h.focus({ preventScroll: true });
        out.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }).catch(function () { say(t('err'), true); })
      .then(function () { btn.disabled = false; });
  });

  /* ---------- results ---------- */
  function champ(kind, key) { return (D.champions[kind] || []).indexOf(key) >= 0; }
  function people(p) {
    var L = [];
    if (p.nyc) {
      if (p.council) L.push({ kind: 'council', group: 'mine', key: p.council, d: p.council, o: D.council[p.council] });
      else L.push({ kind: 'council', group: 'mine', missing: true });
    }
    L.push({ kind: 'assembly', group: 'mine', key: p.ad, d: p.ad, o: D.assembly[p.ad] });
    L.push({ kind: 'senate', group: 'mine', key: p.sd, d: p.sd, o: D.senate[p.sd] });
    if (p.cd != null) L.push({ kind: 'house', group: 'mine', key: p.cd, d: p.cd, o: D.house[p.cd] });
    D.ussenate.forEach(function (s, i) { L.push({ kind: 'ussenate', group: 'also', key: i, o: s }); });
    if (p.nyc) {
      var bp = D.bp[p.county]; if (bp) L.push({ kind: 'bp', group: 'also', key: p.county, o: bp, boro: bp.borough });
      D.city.forEach(function (c) { L.push({ kind: c.key, group: 'also', key: c.key, o: c, city: true }); });
    }
    L.forEach(function (r) {
      r.yes = !r.missing && (r.o && typeof r.o.champ === 'boolean' ? r.o.champ : champ(r.city ? 'city' : r.kind, r.key));
    });
    return L;
  }
  function officeLine(r) {
    var o = t('offices')[r.kind];
    if (r.d != null) o += ' · ' + t('district') + ' ' + r.d;
    if (r.boro) o += ' · ' + r.boro;
    return o;
  }
  function render(p) {
    var L = people(p), held = L.filter(function (r) { return r.o; });
    var yes = held.filter(function (r) { return r.yes; }).length;
    var h = '<p class="reps-matched" tabindex="-1">' + esc(t('matched')) + ' <b>' + esc(p.matched) + '</b></p>';
    h += '<p class="reps-score"><b>' + yes + ' ' + esc(t('of')) + ' ' + held.length + '</b> ' + esc(t('support')) + '</p>';
    if (!p.nyc) h += '<p class="reps-note">' + esc(t('nycOnly')) + '</p>';
    ['mine', 'also'].forEach(function (g) {
      var rows = L.filter(function (r) { return r.group === g; }); if (!rows.length) return;
      h += '<h4 class="reps-group">' + esc(t('groups')[g]) + '</h4><ul class="rep-list">';
      rows.forEach(function (r) { h += card(r, L.indexOf(r)); });
      h += '</ul>';
    });
    out.innerHTML = h;
    Array.prototype.forEach.call(out.querySelectorAll('[data-act]'), function (b) {
      b.addEventListener('click', function () { compose(L[+b.getAttribute('data-act')]); });
    });
  }
  function card(r, i) {
    if (r.missing) {
      return '<li class="rep unknown"><span class="mark" aria-hidden="true">?</span><div class="who"><b>' + esc(t('offices').council) + '</b>' +
        '<span>' + esc(t('councilMiss')) + ' <a href="https://council.nyc.gov/map-widget/" target="_blank" rel="noopener">' + esc(t('councilFind')) + '</a></span></div></li>';
    }
    if (!r.o) {
      return '<li class="rep vacant"><span class="mark" aria-hidden="true">–</span><div class="who"><b>' + esc(officeLine(r)) + '</b><span>' + esc(t('vacant')) + '</span></div></li>';
    }
    var o = r.o, c = '';
    o.emails.forEach(function (e) { c += '<li><span>' + esc(t('email')) + '</span> <a href="mailto:' + esc(e) + '">' + esc(e) + '</a></li>'; });
    o.phones.forEach(function (ph) { c += '<li><span>' + esc(t('call')) + '</span> <a href="tel:' + ph.n.replace(/\D/g, '') + '">' + esc(ph.n) + '</a> <small>' + esc(t('ph')[ph.w] || '') + '</small></li>'; });
    if (o.form) c += '<li><span>' + esc(t('form')) + '</span> <a href="' + esc(o.form) + '" target="_blank" rel="noopener">' + esc(o.form.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + '</a></li>';
    if (o.url) c += '<li><span>' + esc(t('site')) + '</span> <a href="' + esc(o.url) + '" target="_blank" rel="noopener">' + esc(o.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + '</a></li>';
    return '<li class="rep ' + (r.yes ? 'yes' : 'no') + '">' +
      '<span class="mark" role="img" aria-label="' + esc(r.yes ? t('yes') : t('no')) + '">' + (r.yes ? '✓' : '✕') + '</span>' +
      '<div class="who"><b>' + esc(o.name) + '</b><span>' + esc(officeLine(r)) + '</span>' +
      '<span class="state">' + esc(r.yes ? t('yes') : t('no')) + '</span>' +
      '<details class="contacts"><summary>' + esc(t('contacts')) + '</summary><ul>' + c + '</ul></details></div>' +
      '<button type="button" class="btn ' + (r.yes ? '' : 'primary') + '" data-act="' + i + '">' + esc(r.yes ? t('thank') : t('ask')) + '</button></li>';
  }

  /* ---------- letters ---------- */
  function letter(r, L, name) {
    var live = {
      en: r.kind === 'ussenate' ? 'I live in New York' : (r.kind === 'bp' ? 'I live in ' + r.boro : (r.city ? 'I live in New York City' : 'I live in your district')),
      es: r.kind === 'ussenate' ? 'Vivo en Nueva York' : (r.kind === 'bp' ? 'Vivo en ' + r.boro : (r.city ? 'Vivo en la Ciudad de Nueva York' : 'Vivo en su distrito')),
    }[L];
    var o = r.o, ttl = TITLE[L][r.kind], sig = (name || (L === 'es' ? '[Su nombre]' : '[Your name]')) + '\n' + (place ? place.matched : '');
    var asks = L === 'es'
      ? ['Respaldar las demandas de POP: justicia salarial para las proveedoras y financiamiento completo del cuidado infantil',
         'Impulsar en esta sesión la legislación de justicia salarial y el financiamiento completo',
         'Acompañarnos en el lanzamiento de la campaña el 2 de diciembre']
      : ['Endorse POP’s demands: pay justice for providers and full funding for child care',
         'Champion pay justice legislation and full funding this session',
         'Join us to launch the campaign on December 2'];
    if (new Date() > DEC2_OVER) asks.pop();
    var list = asks.map(function (a, i) { return (i + 1) + '. ' + a; }).join('\n');
    if (L === 'es') {
      var hi = 'A la atención de ' + o.name + ', ' + ttl + ':\n\n';
      if (r.yes) return { s: 'Gracias por apoyar a las proveedoras de cuidado infantil', b: hi +
        live + ' y quiero agradecerle por sumarse como campeón de Pay Our Providers, la campaña de Providers Organized for Power (POP).\n\n' +
        'Las proveedoras de cuidado infantil, en centros y en programas de Family Child Care, hacen un trabajo esencial para las niñas, los niños y las familias de Nueva York, y demasiadas ganan salarios de pobreza. Gracias por apoyarlas y por impulsar en esta sesión la legislación de justicia salarial y el financiamiento completo del cuidado infantil.\n\n' +
        'Atentamente,\n' + sig };
      return { s: 'Apoye a las proveedoras de cuidado infantil: súmese a Pay Our Providers', b: hi +
        live + ' y le escribo para pedirle que se sume como campeón de Pay Our Providers, la campaña de Providers Organized for Power (POP), una coalición de proveedoras de cuidado infantil de todo el estado.\n\n' +
        'Las proveedoras de cuidado infantil, en centros y en programas de Family Child Care, hacen un trabajo esencial para nuestras familias. Aun así, una educadora de cuidado infantil en Nueva York gana una mediana de $37,675 al año. POP les pide a sus funcionarios electos:\n' + list + '\n\n' +
        'Puede sumarse aquí: ' + SIGN_ON + '\n\nGracias,\n' + sig };
    }
    var dear = 'Dear ' + ttl + ' ' + lastName(o.name) + ',\n\n';
    if (r.yes) return { s: 'Thank you for standing with child care providers', b: dear +
      live + ', and I want to thank you for signing on as a champion of Pay Our Providers, the campaign led by Providers Organized for Power (POP).\n\n' +
      'Child care providers, in centers and in Family Child Care programs, do essential work for New York’s children and families, and too many of them are paid poverty wages. Thank you for standing with them, and for championing pay justice legislation and full funding for child care this session.\n\n' +
      'Sincerely,\n' + sig };
    return { s: 'Please stand with child care providers: sign on to Pay Our Providers', b: dear +
      live + ', and I’m writing to ask you to sign on as a champion of Pay Our Providers, the campaign led by Providers Organized for Power (POP), a coalition of child care providers across New York.\n\n' +
      'Child care providers, in centers and in Family Child Care programs, do essential work for our families. Yet the median child care educator in New York earns $37,675 a year. POP is asking elected officials to:\n' + list + '\n\n' +
      'You can sign on here: ' + SIGN_ON + '\n\nThank you,\n' + sig };
  }

  /* ---------- composer ---------- */
  var dlg = document.getElementById('rep-send');
  var who = { name: '', email: '', keep: false };
  try { var saved = JSON.parse(localStorage.getItem('pop-reps-me') || 'null'); if (saved) who = saved; } catch (e) {}

  function log(r, how, text) {
    var d = {
      form: 'rep-message', website: '', name: who.name, email: who.email, keep_posted: !!who.keep,
      address: place ? place.matched : '', zip: place ? (place.zip || '') : '',
      official: r.o.name, office: OFFICE_AT[r.kind], district: r.d != null ? String(r.d) : (r.boro || ''),
      type: r.yes ? 'Thank you' : 'Ask to endorse', how: how, champion: !!r.yes, message: text,
      language: lang === 'es' ? 'Spanish' : 'English', page: location.href,
    };
    if (window.POP_REPS_LOG) { window.POP_REPS_LOG(d); return; }
    if (!API) return;
    try {
      fetch(API + '/api/rep-message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), keepalive: true })
        .catch(function () {});
    } catch (e) {}
  }

  function compose(r) {
    var L = lang, o = r.o, txt = letter(r, L, who.name), edited = false;
    var hasEmail = o.emails.length > 0;
    var h = '<div class="join-head"><h2 id="repSendH">' + esc(r.yes ? t('thank') : t('ask')) + ': ' + esc(o.name) + '</h2>' +
      '<button type="button" class="join-x" aria-label="' + esc(t('close')) + '">&times;</button></div><div class="rs-body join-native">';
    h += '<p class="rs-to"><b>' + esc(t('to')) + ':</b> ' + esc(o.name) + ', ' + esc(officeLine(r)) + (hasEmail ? '<br><span>' + esc(o.emails.join(', ')) + '</span>' : '') + '</p>';
    if (!hasEmail) h += '<p class="rs-note">' + esc(t('noEmail')) + (o.formNote === 'nysenate' ? ' ' + esc(t('senNote')) : '') + '</p>';
    h += '<div class="jf-grid"><label><span>' + esc(t('yourName')) + '</span><input name="me" autocomplete="name" required value="' + esc(who.name) + '"></label>' +
      '<label><span>' + esc(t('yourEmail')) + '</span><input name="mail" type="email" autocomplete="email" value="' + esc(who.email) + '"></label></div>' +
      '<label class="rs-keep"><input type="checkbox" name="keep"' + (who.keep ? ' checked' : '') + '> <span>' + esc(t('keep')) + '</span></label>';
    h += '<div class="rs-ll" role="group" aria-label="' + esc(t('letterLang')) + '"><span>' + esc(t('letterLang')) + ':</span> <button type="button" data-l="en" aria-pressed="' + (L === 'en') + '">English</button><button type="button" data-l="es" aria-pressed="' + (L === 'es') + '">Español</button></div>';
    h += '<label class="rs-subj"><span>' + esc(t('subject')) + '</span><input name="subj" value="' + esc(txt.s) + '"></label>';
    h += '<label class="rs-msg"><span>' + esc(t('msg')) + '</span><textarea name="body" rows="12">' + esc(txt.b) + '</textarea></label>';
    h += '<p class="join-err" role="alert" hidden></p><div class="rs-actions">';
    if (hasEmail) h += '<a class="btn primary" data-go="mail" href="#">' + esc(t('openEmail')) + '</a><a class="btn" data-go="gmail" href="#" target="_blank" rel="noopener">' + esc(t('gmail')) + '</a>';
    if (o.form) h += '<a class="btn' + (hasEmail ? '' : ' primary') + '" data-go="form" href="' + esc(o.form) + '" target="_blank" rel="noopener">' + esc(t('copyForm')) + '</a>';
    h += '<button type="button" class="btn" data-go="copy">' + esc(t('copy')) + '</button></div>';
    if (o.phones.length) {
      h += '<p class="rs-call"><b>' + esc(t('callIt')) + ':</b> ' + o.phones.map(function (ph) { return '<a data-go="tel" href="tel:' + ph.n.replace(/\D/g, '') + '">' + esc(ph.n) + '</a> <small>' + esc(t('ph')[ph.w] || '') + '</small>'; }).join(' · ') +
        '<br><span>' + esc((r.yes ? t('scriptThanks') : t('script')).replace('{who}', TITLE.en[r.kind] === 'Mayor' && lang === 'en' ? 'the Mayor' : o.name)) + '</span></p>';
    }
    h += '<p class="rs-done" role="status" hidden></p></div>';
    dlg.innerHTML = h; dlg.lang = lang;
    var f = function (n) { return dlg.querySelector('[name=' + n + ']'); };
    var err = dlg.querySelector('.join-err'), done = dlg.querySelector('.rs-done');
    function refresh() {
      who.name = f('me').value.trim(); who.email = f('mail').value.trim(); who.keep = f('keep').checked;
      try { localStorage.setItem('pop-reps-me', JSON.stringify(who)); } catch (e) {}
      if (!edited) { txt = letter(r, L, who.name); f('body').value = txt.b; f('subj').value = txt.s; }
    }
    f('me').addEventListener('input', refresh); f('mail').addEventListener('input', refresh); f('keep').addEventListener('change', refresh);
    f('body').addEventListener('input', function () { edited = true; });
    Array.prototype.forEach.call(dlg.querySelectorAll('.rs-ll button'), function (b) {
      b.addEventListener('click', function () {
        L = b.getAttribute('data-l'); edited = false; refresh();
        Array.prototype.forEach.call(dlg.querySelectorAll('.rs-ll button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });
    function ready() {
      refresh();
      if (!who.name) { err.textContent = t('needName'); err.hidden = false; f('me').focus(); return false; }
      err.hidden = true; return true;
    }
    function copy() {
      var text = f('subj').value + '\n\n' + f('body').value;
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(function () { legacyCopy(); });
      legacyCopy(); return Promise.resolve();
    }
    function legacyCopy() { var ta = f('body'); ta.focus(); ta.select(); try { document.execCommand('copy'); } catch (e) {} }
    Array.prototype.forEach.call(dlg.querySelectorAll('[data-go]'), function (a) {
      a.addEventListener('click', function (e) {
        var go = a.getAttribute('data-go');
        if (go === 'tel') { if (who.name) log(r, 'Phone', ''); return; }
        if (!ready()) { e.preventDefault(); return; }
        var s = f('subj').value, b = f('body').value;
        if (go === 'mail') {
          e.preventDefault();
          location.href = 'mailto:' + o.emails.map(encodeURIComponent).join(',') + '?subject=' + encodeURIComponent(s) + '&body=' + encodeURIComponent(b);
          log(r, 'Email', b); done.textContent = t('done'); done.hidden = false;
        } else if (go === 'gmail') {
          a.href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(o.emails.join(',')) + '&su=' + encodeURIComponent(s) + '&body=' + encodeURIComponent(b);
          log(r, 'Email', b); done.textContent = t('done'); done.hidden = false;
        } else if (go === 'form') {
          copy(); log(r, 'Contact form', b); done.textContent = t('doneForm'); done.hidden = false;
        } else if (go === 'copy') {
          copy().then(function () { a.textContent = t('copied'); setTimeout(function () { a.textContent = t('copy'); }, 2000); });
        }
      });
    });
    dlg.querySelector('.join-x').addEventListener('click', function () { dlg.close(); });
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    if (!who.name) f('me').focus();
  }
  if (dlg) dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

  paintStatic();
})();
