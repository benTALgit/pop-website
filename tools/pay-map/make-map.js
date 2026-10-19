const topo=require('./tjc/dist/topojson-client.js');
const us=require('./usatlas/counties-10m.json');
// Dots: estimated base layer + real sign-ups, built by make-base.py. Each value: [lat, lon, county, members].
const zl=require('./dots.json');
// NYC borough shorelines (NYC Planning, via github.com/dwillis/nyc-maps) for the inset; the county file is too coarse at that zoom.
const boros=require('./boroughs.geojson.json');
const fs=require('fs');
const all=topo.feature(us,us.objects.counties).features.filter(f=>String(f.id).startsWith('36'));
const state=topo.merge(us,us.objects.counties.geometries.filter(g=>String(g.id).startsWith('36')));
const k=Math.cos(42.8*Math.PI/180);
function mkproj(lon0,lon1,lat0,lat1,x0,y0,w){const s=w/((lon1-lon0)*k);return ([lo,la])=>[x0+(lo-lon0)*k*s,y0+(lat1-la)*s];}
function rdp(pts,eps){if(pts.length<3)return pts;let i0=0,dm=0;const [a,b]=[pts[0],pts[pts.length-1]];for(let i=1;i<pts.length-1;i++){const p=pts[i];const dx=b[0]-a[0],dy=b[1]-a[1];const L=Math.hypot(dx,dy)||1;const d=Math.abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0])/L;if(d>dm){dm=d;i0=i;}}return dm>eps?rdp(pts.slice(0,i0+1),eps).slice(0,-1).concat(rdp(pts.slice(i0),eps)):[a,b];}
function area(r){let s=0;for(let i=0;i<r.length;i++){const [x1,y1]=r[i],[x2,y2]=r[(i+1)%r.length];s+=x1*y2-x2*y1;}return Math.abs(s/2);}
function fine(geom,P){const polys=geom.type==='Polygon'?[geom.coordinates]:geom.coordinates;return polys.map(p=>p.map(r=>r.map(P)).filter(r=>area(r)>1.5).map(r=>{const m=r.length>>1;return rdp(r.slice(0,m+1),.25).slice(0,-1).concat(rdp(r.slice(m),.25));}).filter(r=>r.length>2).map(r=>'M'+r.map(c=>c.map(v=>v.toFixed(1)).join(',')).join('L')+'Z').join('')).join('');}
function path(geom,P){const polys=geom.type==='Polygon'?[geom.coordinates]:geom.coordinates;return polys.map(p=>p.map(r=>'M'+r.map(c=>P(c).map(v=>v.toFixed(1)).join(',')).join('L')+'Z').join('')).join('');}
// counts per county
const cc={};for(const z in zl){const n=zl[z][2].replace(/ County$/,'');cc[n]=(cc[n]||0)+zl[z][3];}
const max=Math.max(...Object.values(cc));
const W=640;const P=mkproj(-79.9,-71.8,40.45,45.05,10,10,W-20);
const H=Math.ceil(P([-79.9,40.45])[1])+10;
function lvl(n){if(n<5)return 0;const r=n/max;return r>.5?4:r>.2?3:r>.07?2:1;}
let s=`<svg viewBox="0 0 ${W} ${H}" class="nymap" role="img" aria-labelledby="mapT"><title id="mapT">Map of New York State showing where campaign members are concentrated: most densely in New York City, with clusters in Buffalo, Rochester, Syracuse, the Capital Region, the Hudson Valley and Long Island</title>\n`;
s+=`<path class="st" d="${path(state,P)}"/>\n`;
for(const f of all){const n=cc[f.properties.name]||0;s+=`<path class="co l${lvl(n)}" d="${path(f.geometry,P)}"><title>${f.properties.name} County</title></path>\n`;}
const NYCZ=new Set(['New York','Kings','Queens','Bronx','Richmond']);
const order=Object.keys(zl).sort((a,b)=>zl[b][3]-zl[a][3]);
for(const z of order){const [la,lo,c,n]=zl[z];if(NYCZ.has(c.replace(/ County$/,'')))continue;const [x,y]=P([lo,la]);s+=`<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.8+1.05*Math.pow(n,.42)).toFixed(1)}"/>`;}
// NYC inset bottom-left
const ix=8,iy=H-188,iw=186,ih=182;
const Q=mkproj(-74.27,-73.68,40.48,40.93,ix+16,iy+24,iw-32);
s+=`\n<defs><clipPath id="nycclip"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}"/></clipPath></defs><g class="inset"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="2"/><g clip-path="url(#nycclip)">`;
const BC={'Manhattan':'New York','Brooklyn':'Kings','Queens':'Queens','Bronx':'Bronx','Staten Island':'Richmond'};
for(const f of boros.features){const c=BC[f.properties.BoroName];const n=cc[c]||0;s+=`<path class="co boro l${lvl(n)}" d="${fine(f.geometry,Q)}"><title>${f.properties.BoroName}</title></path>`;}
for(const z of order){const [la,lo,c,n]=zl[z];if(!NYCZ.has(c.replace(/ County$/,'')))continue;const [x,y]=Q([lo,la]);s+=`<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.2+.65*Math.pow(n,.42)).toFixed(1)}"/>`;}
s+=`</g><text x="${ix+10}" y="${iy+20}" class="lbl">New York City</text></g>\n`;
const [nx,ny]=P([-73.95,40.7]);s+=`<path class="lead" d="M${nx.toFixed(1)},${ny.toFixed(1)}L${ix+iw},${iy+40}"/>\n`;
// region labels
for(const [t,lo,la] of [['Long Island',-72.9,40.95],['Capital Region',-73.95,42.95],['Hudson Valley',-74.35,41.75],['Western NY',-78.45,42.48],['Central NY',-76.1,43.15],['Finger Lakes',-77.1,42.75]]){const [x,y]=P([lo,la]);s+=`<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" class="rl">${t}</text>`;}
s+='</svg>';
fs.writeFileSync('map.svg',s);console.log(H,s.length,cc);
