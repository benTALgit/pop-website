// Builds the "Our Champions" district maps (State Senate, State Assembly, NYC Council) as inline SVG
// and writes them into pay/index.html between <!-- map:NAME --> ... <!-- /map:NAME --> markers.
// Districts with a champion are lit; edit CHAMPS below when someone signs on, then re-run:
//   node tools/pay-map/make-district-maps.js <geo dir>
// <geo dir> holds sldu.json and sldl.json (Census cartographic boundary GeoJSON for NY, STATEFP 36)
// and cc/d1.json ... cc/d51.json (one GeoJSON feature per City Council district, CounDist property).
const fs = require('fs');
const path = require('path');

const CHAMPS = {
  senate: { 25: 'Sen. Jabari Brisport' },
  assembly: { 28: 'Asm. Andrew Hevesi', 36: 'Asm. Diana Moreno', 39: 'Asm. Catalina Cruz', 125: 'Asm. Anna Kelles', 136: 'Asm. Sarah Clark' },
  council: { 21: 'CM Shanel Thomas-Henry', 33: 'CM Lincoln Restler', 34: 'CM Jennifer Gutiérrez', 37: 'CM Sandy Nurse', 38: 'CM Alexa Avilés', 39: 'CM Shahana Hanif' },
};

const dir = process.argv[2];
if (!dir) { console.error('usage: node make-district-maps.js <geo dir>'); process.exit(1); }
const page = path.join(__dirname, '../../pay/index.html');

const k = Math.cos(41.5 * Math.PI / 180);
function mkproj(lon0, lon1, lat0, lat1, x0, y0, w) { const s = w / ((lon1 - lon0) * k); return ([lo, la]) => [x0 + (lo - lon0) * k * s, y0 + (lat1 - la) * s]; }
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let i0 = 0, dm = 0; const a = pts[0], b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const d = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / L;
    if (d > dm) { dm = d; i0 = i; }
  }
  return dm > eps ? rdp(pts.slice(0, i0 + 1), eps).slice(0, -1).concat(rdp(pts.slice(i0), eps)) : [a, b];
}
function area(r) { let s = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s / 2); }
function d(geom, P, eps, minA) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.map(p => p.map(r => r.map(P)).filter(r => area(r) > minA).map(r => {
    const m = r.length >> 1; return rdp(r.slice(0, m + 1), eps).slice(0, -1).concat(rdp(r.slice(m), eps));
  }).filter(r => r.length > 2).map(r => 'M' + r.map(c => c.map(v => v.toFixed(1)).join(',')).join('L') + 'Z').join('')).join('');
}
function inBox(geom, [lo0, lo1, la0, la1]) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.some(p => p[0].some(([lo, la]) => lo > lo0 && lo < lo1 && la > la0 && la < la1));
}

// Statewide map with a New York City inset (most districts there are too small to see at state scale).
function stateMap(file, prop, lit, id, label) {
  const fc = JSON.parse(fs.readFileSync(path.join(dir, file)));
  const W = 640, P = mkproj(-79.8, -71.85, 40.5, 45.02, 6, 6, W - 12);
  const H = Math.ceil(P([-79.8, 40.5])[1]) + 6;
  const names = Object.values(lit);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="dmap" role="img" aria-labelledby="${id}T"><title id="${id}T">Map of New York ${label} districts, with our champions' districts lit: ${names.join(', ')}</title>\n`;
  let litS = '';
  for (const f of fc.features) {
    const n = +f.properties[prop]; const on = lit[n];
    const p = `<path class="ds${on ? ' on' : ''}" d="${d(f.geometry, P, .35, .4)}"><title>${label} District ${n}${on ? ': ' + on : ''}</title></path>`;
    if (on) litS += p; else s += p;
  }
  s += litS;
  // Inset sits top-left, over Lake Ontario, where the state map is empty.
  const ix = 4, iw = 196, ih = 176, iy = 4;
  const box = [-74.27, -73.69, 40.49, 40.92];
  const Q = mkproj(box[0], box[1], box[2], box[3], ix + 10, iy + 26, iw - 20);
  s += `<defs><clipPath id="${id}clip"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}"/></clipPath></defs><g class="inset"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}"/><g clip-path="url(#${id}clip)">`;
  litS = '';
  for (const f of fc.features) {
    if (!inBox(f.geometry, [-74.4, -73.6, 40.45, 41.0])) continue;
    const n = +f.properties[prop]; const on = lit[n];
    const p = `<path class="ds${on ? ' on' : ''}" d="${d(f.geometry, Q, .3, .3)}"><title>${label} District ${n}${on ? ': ' + on : ''}</title></path>`;
    if (on) litS += p; else s += p;
  }
  s += litS + `</g><text x="${ix + 10}" y="${iy + 18}" class="lbl">New York City</text></g>`;
  const [nx, ny] = P([-73.95, 40.72]);
  s += `<path class="lead" d="M${nx.toFixed(1)},${ny.toFixed(1)}L${ix + iw},${iy + ih}"/></svg>`;
  return s;
}

function councilMap(lit, id) {
  const fs_ = [];
  for (let i = 1; i <= 51; i++) fs_.push(JSON.parse(fs.readFileSync(path.join(dir, 'cc', `d${i}.json`))));
  const W = 420, P = mkproj(-74.26, -73.695, 40.495, 40.918, 6, 6, W - 12);
  const H = Math.ceil(P([-74.26, 40.495])[1]) + 6;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="dmap" role="img" aria-labelledby="${id}T"><title id="${id}T">Map of New York City Council districts, with our champions' districts lit: ${Object.values(lit).join(', ')}</title>\n`;
  let litS = '';
  for (const f of fs_) {
    const n = +f.properties.CounDist; const on = lit[n];
    const p = `<path class="ds${on ? ' on' : ''}" d="${d(f.geometry, P, .3, .3)}"><title>Council District ${n}${on ? ': ' + on : ''}</title></path>`;
    if (on) litS += p; else s += p;
  }
  return s + litS + '</svg>';
}

const maps = {
  senate: stateMap('sldu.json', 'NAME', CHAMPS.senate, 'mapSen', 'State Senate'),
  assembly: stateMap('sldl.json', 'NAME', CHAMPS.assembly, 'mapAsm', 'Assembly'),
  council: councilMap(CHAMPS.council, 'mapCC'),
};
let html = fs.readFileSync(page, 'utf8');
for (const [name, svg] of Object.entries(maps)) {
  const re = new RegExp(`(<!-- map:${name} -->)[\\s\\S]*?(<!-- /map:${name} -->)`);
  if (!re.test(html)) { console.error('missing marker map:' + name); process.exit(1); }
  html = html.replace(re, `$1${svg}$2`);
  console.log(name, svg.length);
}
fs.writeFileSync(page, html);
