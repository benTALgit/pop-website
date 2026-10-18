# Writes tools/pay-map/dots.json: the map's dots. A base layer of estimated members per county
# (from what member groups report; edit COUNTIES as estimates improve), spread over real zips
# with varied sizes, plus the real sign-ups in signups-zips.json added on top.
import json, random, math, zipcodes
COUNTIES = {  # county: estimated members (relative; NYC and Long Island deepest)
 'Kings': 900, 'Queens': 850, 'Bronx': 600, 'New York': 500, 'Richmond': 120,
 'Nassau': 240, 'Suffolk': 260, 'Westchester': 200, 'Rockland': 60, 'Orange': 70, 'Dutchess': 70,
 'Ulster': 30, 'Putnam': 15, 'Erie': 260, 'Niagara': 30, 'Monroe': 160, 'Onondaga': 120,
 'Albany': 120, 'Schenectady': 40, 'Rensselaer': 35, 'Saratoga': 30, 'Tompkins': 40, 'Broome': 50,
 'Oneida': 45, 'Columbia': 12,
}
SINGLES = ['Chautauqua', 'Jefferson', 'St. Lawrence', 'Clinton', 'Steuben', 'Chemung', 'Otsego',
           'Cattaraugus', 'Ontario', 'Oswego', 'Sullivan', 'Warren', 'Livingston', 'Cortland']
NYC = {'Kings', 'Queens', 'Bronx', 'New York', 'Richmond'}
rnd = random.Random(7)
byc = {}
for z in zipcodes.filter_by(state='NY'):
    if z['zip_code_type'] != 'STANDARD' or not z['county'] or not float(z['long'] or 0): continue
    byc.setdefault(z['county'].replace(' County', ''), []).append(z)
dots = {}
def add(z, n):
    d = dots.setdefault(z['zip_code'], [float(z['lat']), float(z['long']), z['county'], 0]); d[3] += n
for c, total in COUNTIES.items():
    zs = byc[c]; k = min(len(zs), round(0.55 * math.sqrt(total)) + 2)
    w = sorted((rnd.paretovariate(1.3) for _ in range(k)), reverse=True)
    s = sum(w)
    for z, x in zip(rnd.sample(zs, k), w): add(z, max(1, round(total * x / s)))
for c in SINGLES: add(rnd.choice(byc[c]), rnd.choice([1, 1, 2]))
for zc, (la, lo, county, n) in json.load(open('tools/pay-map/signups-zips.json')).items():
    if zc in dots: dots[zc][3] += n
    else: dots[zc] = [la, lo, county, n]
json.dump(dots, open('tools/pay-map/dots.json', 'w'), separators=(',', ':'))
tot = {}
for d in dots.values(): tot[d[2]] = tot.get(d[2], 0) + d[3]
print(len(dots), sorted(((v, k) for k, v in tot.items()), reverse=True)[:12])
print(sorted(d[3] for d in dots.values())[-10:])
