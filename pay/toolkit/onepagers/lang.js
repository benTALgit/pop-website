// ?lang=es shows the Spanish sheet; the bar switches language and prints.
(function () {
  var es = /[?&]lang=es\b/.test(location.search);
  document.documentElement.lang = es ? 'es' : 'en';
  document.querySelectorAll('[data-setlang]').forEach(function (a) {
    if (a.getAttribute('data-setlang') === (es ? 'es' : 'en')) a.classList.add('on');
  });
  var p = document.getElementById('print');
  if (p) p.addEventListener('click', function () { window.print(); });
})();
