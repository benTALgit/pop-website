// Address suggestions for the "Are your reps supporting POP?" lookup (#your-reps), from Google Places (New).
// The key is a browser key, locked in Google Cloud to popchildcare.org / popny.org, so it is fine in page code.
// Google loads only when someone starts typing. If it fails, the box stays a normal field with the browser's own autofill.
(function () {
  var KEY = 'AIzaSyAKYEhO8rtwds8RuY3_2j_zkDd-hOV4MQs';
  var root = document.getElementById('your-reps');
  var input = root && root.querySelector('input[name=address]');
  if (!input) return;
  var form = input.form, label = input.closest('label') || input.parentNode;
  // New York State, roughly: suggestions stay inside it.
  var NY = { north: 45.02, south: 40.48, east: -71.79, west: -79.77 };

  var box = document.createElement('ul');
  box.className = 'addr-list'; box.id = 'addr-list'; box.setAttribute('role', 'listbox'); box.hidden = true;
  label.style.position = 'relative'; label.appendChild(box);
  input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-controls', 'addr-list');

  var places = null, loading = null, token = null, items = [], active = -1, seq = 0, timer = null, picking = false;

  function load() {
    if (window.POP_ADDR_MOCK) { places = window.POP_ADDR_MOCK; return Promise.resolve(places); }
    if (loading) return loading;
    loading = new Promise(function (ok, bad) {
      window.__popMapsReady = function () { ok(); };
      var s = document.createElement('script');
      s.src = 'https://maps.googleapis.com/maps/api/js?key=' + KEY + '&loading=async&callback=__popMapsReady&v=weekly';
      s.async = true; s.onerror = bad; document.head.appendChild(s);
    }).then(function () { return google.maps.importLibrary('places'); })
      .then(function (lib) {
        places = lib;
        // Google takes over suggestions, so turn off the browser's own list to avoid two dropdowns.
        input.setAttribute('autocomplete', 'off');
        return lib;
      });
    loading.catch(function () { loading = null; });
    return loading;
  }

  function close() { box.hidden = true; box.innerHTML = ''; items = []; active = -1; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
  function mark(i) {
    active = i;
    Array.prototype.forEach.call(box.children, function (li, j) { li.setAttribute('aria-selected', String(j === i)); });
    if (i >= 0) input.setAttribute('aria-activedescendant', 'addr-opt-' + i); else input.removeAttribute('aria-activedescendant');
  }
  function show(list) {
    items = list; box.innerHTML = '';
    if (!list.length) { close(); return; }
    list.forEach(function (p, i) {
      var li = document.createElement('li');
      li.id = 'addr-opt-' + i; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false');
      var main = p.mainText ? p.mainText.toString() : p.text.toString();
      var sub = p.secondaryText ? p.secondaryText.toString().replace(/, USA$/, '') : '';
      li.innerHTML = '<b></b><span></span>';
      li.firstChild.textContent = main; li.lastChild.textContent = sub;
      li.addEventListener('mousedown', function (e) { e.preventDefault(); pick(i); });
      box.appendChild(li);
    });
    box.hidden = false; input.setAttribute('aria-expanded', 'true'); mark(-1);
  }

  function suggest() {
    var q = input.value.trim(), n = ++seq;
    if (q.length < 4) { close(); return; }
    load().then(function (lib) {
      if (!token) token = new lib.AutocompleteSessionToken();
      return lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q, sessionToken: token, includedRegionCodes: ['us'], locationRestriction: NY,
        language: (root.lang || 'en') === 'es' ? 'es' : 'en',
      });
    }).then(function (res) {
      if (n !== seq || picking) return;
      show((res.suggestions || []).map(function (s) { return s.placePrediction; }).filter(Boolean).slice(0, 5));
    }).catch(function () { if (n === seq) close(); });
  }

  function pick(i) {
    var p = items[i]; if (!p) return;
    picking = true;
    var text = p.text.toString().replace(/, USA$/, '');
    input.value = text; close();
    // Full address with zip code, so the district lookup gets it right. This also closes the paid Google "session".
    var place = p.toPlace();
    var t = token; token = null;
    Promise.resolve(place.fetchFields({ fields: ['formattedAddress'] }))
      .then(function () { if (place.formattedAddress) input.value = place.formattedAddress.replace(/, USA$/, ''); })
      .catch(function () {})
      .then(function () {
        picking = false;
        if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true }));
      });
    return t;
  }

  input.addEventListener('focus', function () { load().catch(function () {}); }, { once: true });
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(suggest, 220); });
  input.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); mark((active + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); mark(active <= 0 ? items.length - 1 : active - 1); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape') { close(); }
  });
  input.addEventListener('blur', function () { setTimeout(close, 150); });
  form.addEventListener('submit', function () { seq++; close(); });
})();
