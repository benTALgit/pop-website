const topo=require('./tjc/dist/topojson-client.js');
const us=require('./usatlas/counties-10m.json');
const zl=require('./zipll.json');
// Representative clusters where member groups organize but the sign-up list is thin (to be replaced with real data).
const extra=[['Buffalo',42.89,-78.85,'Erie',4],['Buffalo',42.93,-78.82,'Erie',3],['Buffalo',42.91,-78.88,'Erie',3],['Buffalo',42.86,-78.81,'Erie',2],['Buffalo',42.95,-78.87,'Erie',2],
 ['Rochester',43.16,-77.61,'Monroe',3],['Rochester',43.19,-77.63,'Monroe',2],['Rochester',43.13,-77.58,'Monroe',2],
 ['Syracuse',43.05,-76.15,'Onondaga',3],['Syracuse',43.03,-76.12,'Onondaga',2],
 ['Ithaca',42.44,-76.50,'Tompkins',2],['Binghamton',42.10,-75.91,'Broome',2],['Utica',43.10,-75.23,'Oneida',2],
 ['Albany',42.68,-73.78,'Albany',2],['Schenectady',42.81,-73.94,'Schenectady',1],['Newburgh',41.50,-74.02,'Orange',2],['Yonkers',40.94,-73.88,'Westchester',2],['Hempstead',40.71,-73.62,'Nassau',2]];
extra.forEach((e,i)=>{zl['x'+i]=[e[1],e[2],e[3]+' County',e[4]];});
const fs=require('fs');
const all=topo.feature(us,us.objects.counties).features.filter(f=>String(f.id).startsWith('36'));
const state=topo.merge(us,us.objects.counties.geometries.filter(g=>String(g.id).startsWith('36')));
const k=Math.cos(42.8*Math.PI/180);
function mkproj(lon0,lon1,lat0,lat1,x0,y0,w){const s=w/((lon1-lon0)*k);return ([lo,la])=>[x0+(lo-lon0)*k*s,y0+(lat1-la)*s];}
function path(geom,P){const polys=geom.type==='Polygon'?[geom.coordinates]:geom.coordinates;return polys.map(p=>p.map(r=>'M'+r.map(c=>P(c).map(v=>v.toFixed(1)).join(',')).join('L')+'Z').join('')).join('');}
// counts per county
const cc={};for(const z in zl){const n=zl[z][2].replace(/ County$/,'');cc[n]=(cc[n]||0)+zl[z][3];}
const max=Math.max(...Object.values(cc));
const W=640;const P=mkproj(-79.9,-71.8,40.45,45.05,10,10,W-20);
const H=Math.ceil(P([-79.9,40.45])[1])+10;
function lvl(n){if(!n)return 0;const r=n/max;return r>.5?4:r>.2?3:r>.07?2:1;}
let s=`<svg viewBox="0 0 ${W} ${H}" class="nymap" role="img" aria-labelledby="mapT"><title id="mapT">Map of New York State showing where campaign members are concentrated: most densely in New York City, with clusters in Buffalo, Rochester, Syracuse, the Capital Region, the Hudson Valley and Long Island</title>\n`;
s+=`<path class="st" d="${path(state,P)}"/>\n`;
for(const f of all){const n=cc[f.properties.name]||0;s+=`<path class="co l${lvl(n)}" d="${path(f.geometry,P)}"><title>${f.properties.name} County${n?`: ${n} sign-ups`:''}</title></path>\n`;}
const NYCZ=new Set(['New York','Kings','Queens','Bronx','Richmond']);
for(const z in zl){const [la,lo,c,n]=zl[z];if(NYCZ.has(c.replace(/ County$/,'')))continue;const [x,y]=P([lo,la]);s+=`<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(4.5+2.6*Math.sqrt(n)).toFixed(1)}"/>`;}
// NYC inset bottom-left
const ix=8,iy=H-188,iw=186,ih=182;
const Q=mkproj(-74.27,-73.68,40.48,40.93,ix+16,iy+24,iw-32);
s+=`\n<defs><clipPath id="nycclip"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}"/></clipPath></defs><g class="inset"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="2"/><g clip-path="url(#nycclip)">`;
for(const f of all){if(!NYCZ.has(f.properties.name))continue;const n=cc[f.properties.name]||0;s+=`<path class="co l${lvl(n)}" d="${path(f.geometry,Q)}"><title>${f.properties.name} County: ${n} sign-ups</title></path>`;}
for(const z in zl){const [la,lo,c,n]=zl[z];if(!NYCZ.has(c.replace(/ County$/,'')))continue;const [x,y]=Q([lo,la]);s+=`<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2.6+1.5*Math.sqrt(n)).toFixed(1)}"/>`;}
s+=`</g><text x="${ix+10}" y="${iy+20}" class="lbl">New York City</text></g>\n`;
const [nx,ny]=P([-73.95,40.7]);s+=`<path class="lead" d="M${nx.toFixed(1)},${ny.toFixed(1)}L${ix+iw},${iy+40}"/>\n`;
// region labels
for(const [t,lo,la] of [['Long Island',-72.9,40.95],['Capital Region',-73.95,42.95],['Hudson Valley',-74.35,41.75],['Western NY',-78.45,42.48],['Central NY',-76.1,43.15],['Finger Lakes',-77.1,42.75]]){const [x,y]=P([lo,la]);s+=`<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" class="rl">${t}</text>`;}
{const [bx,by]=P([-78.86,42.90]);s+=`<circle class="ring" cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="26"/><text x="${(bx-30).toFixed(0)}" y="${(by-32).toFixed(0)}" class="lbl hl">Buffalo launch</text>`;}
s+='</svg>';
fs.writeFileSync('map.svg',s);console.log(H,s.length,cc);
