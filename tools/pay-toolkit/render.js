// Renders the Pay Our Providers toolkit files from their HTML sources.
// Run from the repo root with a static server on :8765 (python3 -m http.server 8765):
//   node tools/pay-toolkit/render.js
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const BASE = 'http://localhost:8765';
const OUT = path.join(__dirname, '..', '..', 'pay', 'toolkit');
const onepagers = [
  ['legislators', 'en'], ['providers', 'en'], ['providers', 'es'], ['parents', 'en'], ['parents', 'es'],
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 1200 }, deviceScaleFactor: 1 });
  await page.goto(BASE + '/tools/pay-toolkit/cards.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  for (const card of await page.$$('.card')) {
    const id = await card.getAttribute('id');
    await card.screenshot({ path: path.join(OUT, 'social', id + '.png') });
    console.log('social', id);
  }
  for (const [name, lang] of onepagers) {
    await page.goto(`${BASE}/pay/toolkit/onepagers/${name}.html${lang === 'es' ? '?lang=es' : ''}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const file = `pay-our-providers-${name}${lang === 'es' ? '-es' : ''}.pdf`;
    await page.pdf({ path: path.join(OUT, 'onepagers', file), format: 'Letter', printBackground: true, preferCSSPageSize: true });
    console.log('pdf', file);
  }
  await browser.close();
})();
