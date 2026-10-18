/* Text editing for the claude.ai preview of popny.org/pay (not part of the live site).
   Text blocks carry data-e ids (tools/preview_edits.py tag). Saved edits live in edits.json
   next to the page, as {savedAt, edits: {id: innerHTML}}; tools/preview_edits.py apply
   writes them back into pay/index.html. */
(function () {
  var blocks = {};
  document.querySelectorAll('[data-e]').forEach(function (el) { blocks[el.getAttribute('data-e')] = el; });
  var saved = {};   // what edits.json holds
  var base = {};    // each block's HTML as last saved

  function applyEdits(map) {
    Object.keys(map).forEach(function (k) { if (blocks[k]) blocks[k].innerHTML = map[k]; });
  }
  function snapshot() { Object.keys(blocks).forEach(function (k) { base[k] = blocks[k].innerHTML; }); }

  var loaded = fetch('edits.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j && j.edits) { saved = j.edits; applyEdits(saved); } })
    .catch(function () {})
    .then(snapshot);

  var css = document.createElement('style');
  css.textContent =
    '.pe-bar{position:fixed;right:16px;bottom:16px;z-index:50;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;max-width:calc(100vw - 32px);font:600 14px/1.2 "Libre Franklin",system-ui,sans-serif}' +
    '.pe-bar button{font:800 14px/1 "Libre Franklin",system-ui,sans-serif;padding:12px 16px;border:2px solid #1F1A1A;background:#fff;color:#1F1A1A;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.18)}' +
    '.pe-bar button.pe-main{background:#B8361C;border-color:#B8361C;color:#fff}' +
    '.pe-bar button[disabled]{opacity:.55;cursor:default}' +
    '.pe-msg{background:#1F1A1A;color:#fff;padding:10px 12px;box-shadow:0 4px 14px rgba(0,0,0,.18)}' +
    '.pe-bar[hidden],.pe-bar [hidden]{display:none!important}' +
    'body.pe-on [data-e]{outline:1px dashed rgba(31,122,116,.55);outline-offset:2px;cursor:text}' +
    'body.pe-on [data-e]:hover{outline-color:#1F7A74}' +
    'body.pe-on [data-e]:focus{outline:2px solid #1F7A74;background:rgba(31,122,116,.07)}' +
    'body.pe-on [data-e].pe-changed{outline:2px solid #D9472B}';
  document.head.appendChild(css);

  var bar = document.createElement('div');
  bar.className = 'pe-bar';
  bar.hidden = true;
  var msg = document.createElement('span'); msg.className = 'pe-msg'; msg.hidden = true;
  var edit = button('Edit text', 'pe-main');
  var save = button('Save', 'pe-main');
  var cancel = button('Cancel');
  var copy = button('Copy edits');
  save.hidden = cancel.hidden = copy.hidden = true;
  [msg, copy, cancel, save, edit].forEach(function (b) { bar.appendChild(b); });
  document.body.appendChild(bar);

  function button(label, cls) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = label;
    if (cls) b.className = cls;
    return b;
  }
  function say(text) { msg.textContent = text; msg.hidden = !text; }

  function changes() {
    var out = {};
    Object.keys(blocks).forEach(function (k) {
      var now = blocks[k].innerHTML;
      blocks[k].classList.toggle('pe-changed', now !== base[k]);
      if (now !== base[k]) out[k] = now;
    });
    return out;
  }
  function refresh() {
    var n = Object.keys(changes()).length;
    save.disabled = !n;
    save.textContent = n ? 'Save ' + n + (n === 1 ? ' change' : ' changes') : 'Save';
  }

  function setEditing(on) {
    document.body.classList.toggle('pe-on', on);
    Object.keys(blocks).forEach(function (k) {
      if (on) blocks[k].setAttribute('contenteditable', 'true');
      else { blocks[k].removeAttribute('contenteditable'); blocks[k].classList.remove('pe-changed'); }
    });
    if (on) document.querySelectorAll('details.sec, details.more').forEach(function (d) { d.open = true; });
    edit.hidden = on; save.hidden = cancel.hidden = !on; copy.hidden = true;
    say(on ? 'Click any text to change it.' : '');
    if (on) refresh();
  }

  // While editing, links and section headers shouldn't navigate or fold.
  document.addEventListener('click', function (e) {
    if (!document.body.classList.contains('pe-on') || bar.contains(e.target)) return;
    if (e.target.closest('a, summary')) e.preventDefault();
  }, true);
  document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('[data-e]')) refresh(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.closest && e.target.closest('[data-e]')) e.preventDefault();
  });
  document.addEventListener('paste', function (e) {
    if (!(e.target.closest && e.target.closest('[data-e]'))) return;
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  });

  cancel.addEventListener('click', function () {
    Object.keys(blocks).forEach(function (k) { blocks[k].innerHTML = base[k]; });
    setEditing(false);
  });

  function merged() {
    var all = {}, k, c = changes();
    for (k in saved) all[k] = saved[k];
    for (k in c) all[k] = c[k].replace(/\u00a0|&nbsp;/g, ' ').replace(/(<br\s*\/?>\s*)+$/, '');
    return all;
  }

  var artifact = null;
  save.addEventListener('click', function () {
    var all = merged();
    save.disabled = true; save.textContent = 'Saving…'; say('');
    artifact.publish({ 'edits.json': { content: JSON.stringify({ savedAt: new Date().toISOString(), edits: all }, null, 1), contentType: 'application/json' } })
      .then(function () {
        saved = all; snapshot(); setEditing(false);
        say('Saved. Claude will copy these edits to the GitHub version.');
        setTimeout(function () { say(''); }, 6000);
      })
      .catch(function (err) {
        var code = err && err.code;
        refresh();
        if (code === 'conflict') { say('Someone else saved first. The page will reload with their version.'); return; }
        if (code === 'not_writer' || code === 'not_granted') { say('This view is read-only, so edits can’t be saved here.'); }
        else if (code === 'capability_disabled') { say('Saving isn’t available in this view. Copy your edits and paste them to Claude.'); }
        else { say('Couldn’t save (' + (code || 'error') + '). Try again, or copy your edits and paste them to Claude.'); }
        copy.hidden = false;
      });
  });
  copy.addEventListener('click', function () {
    var text = JSON.stringify({ edits: merged() });
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(function () { say('Copied. Paste it to Claude in the thread.'); })
      .catch(function () { window.prompt('Copy these edits and paste them to Claude:', text); });
  });
  edit.addEventListener('click', function () { loaded.then(function () { setEditing(true); }); });

  if (window.claude && typeof window.claude.use === 'function') {
    Promise.all([window.claude.use('artifact'), window.claude.use('user')]).then(function (r) {
      artifact = r[0];
      if (!artifact) return;
      return (r[1] ? r[1].canEdit() : Promise.resolve(true)).then(function (can) {
        if (can !== false) bar.hidden = false;
      });
    }).catch(function () {});
  }
})();
