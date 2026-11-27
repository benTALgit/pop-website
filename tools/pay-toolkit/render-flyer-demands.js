// Render tools/pay-toolkit/flyer-demands.html to demands-<lang>.pdf and demands-<lang>.png in <outdir>. Needs @fontsource/unbounded and @fontsource/libre-franklin installed next to it (NM below).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2];
const NM = path.join(__dirname, 'node_modules', '@fontsource');
function fontCss() {
  let css = '';
  for (const [pkg, weights] of [['unbounded', [600, 800]], ['libre-franklin', [400, 600, 800]]])
    for (const wt of weights) css += fs.readFileSync(path.join(NM, pkg, `${wt}.css`), 'utf8').replace(/url\(\.\/files\//g, `url(https://fonts.local/${pkg}/files/`);
  return css;
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const lang of ['en', 'es']) {
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 1275 / 816 });
    await page.route(/fonts\.googleapis\.com/, r => r.fulfill({ contentType: 'text/css', body: fontCss() }));
    await page.route(/fonts\.local/, r => r.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(NM, new URL(r.request().url()).pathname.slice(1))) }));
    await page.goto(`http://localhost:8765/tools/pay-toolkit/flyer-demands.html${lang === 'es' ? '?lang=es' : ''}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready); await page.waitForSelector("body[data-ready]");
    const fam = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight).join(', '));
    console.log(lang, 'fonts loaded:', fam);
    await page.screenshot({ path: path.join(out, `demands-${lang}.png`), omitBackground: true, clip: { x: 0, y: 0, width: 816, height: 1056 } });
    await page.pdf({ path: path.join(out, `demands-${lang}.pdf`), width: '8.5in', height: '11in', printBackground: true, pageRanges: '1' });
  }
  await browser.close();
})();
