# Builds pay/reps/officials.js, the data behind the "Are your reps supporting POP?" lookup on /campaign.
#
#   python3 tools/reps/build-officials.py
#
# Sources (all official, saved in tools/reps/data/ on the date in UPDATED):
#   asm.json      nyassembly.gov/mem/ (name, district, email, district + Albany offices)
#   sen.json      nysenate.gov/senators-committees + each senator's /contact page (emails, office phones)
#   cong.json     unitedstates/congress-legislators legislators-current (House + US Senate, phone, site, contact form)
#   council.txt   council.nyc.gov/districts/ (member and district email)
#   CITY below    nyc.gov contact pages for the Mayor, Public Advocate, Comptroller and the five Borough Presidents
#
# CHAMPIONS: who gets a check. Keep in step with the Champions section of pay/index.html
# (and tools/pay-map/make-district-maps.js) whenever someone signs on.
import json, re, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../..'))
UPDATED = '2026-11-10'

CHAMPIONS = {
    'senate': [25, 31],
    'assembly': [28, 36, 39, 57, 67, 87, 106, 125, 136],
    'council': [21, 33, 34, 37, 38, 39],
    'house': [], 'ussenate': [], 'city': [], 'bp': [],
}

def load(name):
    return json.load(open(os.path.join(HERE, 'data', name)))

def phone_fmt(p):
    d = re.sub(r'\D', '', p)
    return f'({d[0:3]}) {d[3:6]}-{d[6:10]}' if len(d) == 10 else p.strip()

def office_label(phone):
    return 'albany' if re.sub(r'\D', '', phone).startswith('518455') else 'district'

out = {'updated': UPDATED}

# Whitney's cleaned NYCAT email lists (TAL's own Sept-Oct 2026 invitations and endorsement asks, cleaned Nov 10, 2026),
# keyed "chamber|district". Where an office is listed, that list is used exactly as written (order and spelling kept);
# offices not listed use the official emails from the source files above. To change someone's emails, edit them in
# Airtable (Elected Officials) and mirror the change here, so the backup bundle never drifts from what the site shows.
STAFF = json.load(open(os.path.join(HERE, 'data', 'staff-emails.json')))
def with_staff(chamber, district, emails):
    return STAFF.get(f'{chamber}|{district}', emails)

# State Senate
sen = {}
for s in load('sen.json'):
    emails = [e for e in s['emails'] if not re.search(r'sched|calendar', e, re.I)]
    phones = []
    for o in s['offices']:
        p = phone_fmt(o['phone'])
        if p not in [x['n'] for x in phones]:
            phones.append({'n': p, 'w': office_label(p)})
    name = re.sub(r'^Mr\.\s+', '', re.sub(r'\s+', ' ', s['name'])).strip()
    sen[s['district']] = {'name': name, 'emails': with_staff('senate', s['district'], emails), 'phones': phones[:3],
                          'form': s['url'] + '/contact', 'url': s['url'], 'formNote': 'nysenate'}
out['senate'] = sen

# Assembly
asm = {}
for a in load('asm.json'):
    phones = []
    for o in a['offices']:
        m = [x for x in re.findall(r'\d{3}-\d{3}-\d{4}', o.split('Fax')[0])]
        if m:
            p = phone_fmt(m[0])
            if p not in [x['n'] for x in phones]:
                phones.append({'n': p, 'w': office_label(p)})
    asm[a['district']] = {'name': re.sub(r'\s+', ' ', a['name']).strip(), 'emails': with_staff('assembly', a['district'], a['emails']),
                          'phones': phones[:3], 'url': 'https://www.nyassembly.gov/mem/' + a['slug']}
out['assembly'] = asm

# NYC Council
cc = {}
for line in open(os.path.join(HERE, 'data', 'council.txt'), encoding='utf-8'):
    if not line.strip():
        continue
    d, name, email = line.strip().split('|')
    cc[int(d)] = {'name': name, 'emails': with_staff('council', int(d), [email]), 'phones': [], 'url': f'https://council.nyc.gov/district-{d}/'}
out['council'] = cc

# Congress
house, ussen = {}, []
for c in load('cong.json'):
    entry = {'name': c['name'], 'emails': [], 'phones': [{'n': phone_fmt(c['phone']), 'w': 'dc'}] if c.get('phone') else [],
             'url': c['url'], 'form': c.get('contact') or (c['url'].rstrip('/') + '/contact')}
    if c['type'] == 'rep':
        house[c['district']] = entry
    else:
        ussen.append(entry)
out['house'] = house
out['ussenate'] = sorted(ussen, key=lambda x: x['name'].split()[-1])

# Citywide and borough officials (NYC only). Forms and phones from their own contact pages; none list a general email.
out['city'] = [
    {'key': 'mayor', 'name': 'Zohran Mamdani', 'emails': [], 'phones': [{'n': '(212) 788-3000', 'w': 'office'}],
     'url': 'https://www.nyc.gov/mayors-office', 'form': 'https://www.nyc.gov/mayors-office/contact-the-mayor'},
    {'key': 'pa', 'name': 'Jumaane D. Williams', 'emails': [], 'phones': [{'n': '(212) 669-7250', 'w': 'office'}],
     'url': 'https://advocate.nyc.gov/', 'form': 'https://advocate.nyc.gov/intake'},
    {'key': 'comptroller', 'name': 'Mark D. Levine', 'emails': [], 'phones': [{'n': '(212) 669-3500', 'w': 'office'}],
     'url': 'https://comptroller.nyc.gov/', 'form': 'https://comptroller.nyc.gov/about/contact-our-office/'},
]
# Keyed by county FIPS: 005 Bronx, 047 Brooklyn (Kings), 061 Manhattan (New York), 081 Queens, 085 Staten Island (Richmond)
out['bp'] = {
    '061': {'name': 'Brad Hoylman-Sigal', 'borough': 'Manhattan', 'emails': [], 'phones': [{'n': '(212) 669-8300', 'w': 'office'}],
            'url': 'https://www.manhattanbp.nyc.gov/', 'form': 'https://www.manhattanbp.nyc.gov/connect/'},
    '047': {'name': 'Antonio Reynoso', 'borough': 'Brooklyn', 'emails': [], 'phones': [{'n': '(718) 802-3700', 'w': 'office'}],
            'url': 'https://www.brooklynbp.nyc.gov/', 'form': 'https://www.brooklynbp.nyc.gov/contact/'},
    '005': {'name': 'Vanessa L. Gibson', 'borough': 'Bronx', 'emails': ['webmail@bronxbp.nyc.gov'], 'phones': [{'n': '(718) 590-3500', 'w': 'office'}],
            'url': 'https://bronxboropres.nyc.gov/', 'form': 'https://bronxboropres.nyc.gov/contact/index.php'},
    '081': {'name': 'Donovan Richards Jr.', 'borough': 'Queens', 'emails': [], 'phones': [],
            'url': 'https://www.queensbp.nyc.gov/', 'form': 'https://www.queensbp.nyc.gov/contact/'},
    '085': {'name': 'Vito J. Fossella', 'borough': 'Staten Island', 'emails': [], 'phones': [{'n': '(718) 816-2000', 'w': 'office'}],
            'url': 'https://www.statenislandusa.com/', 'form': 'https://www.statenislandusa.com/contact.html'},
}
out['champions'] = CHAMPIONS

dest = os.path.join(ROOT, 'pay', 'reps', 'officials.js')
os.makedirs(os.path.dirname(dest), exist_ok=True)
with open(dest, 'w', encoding='utf-8') as f:
    f.write('// Generated by tools/reps/build-officials.py. Edit the data there, then re-run.\n')
    f.write('window.POP_OFFICIALS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('wrote', dest, os.path.getsize(dest), 'bytes;',
      len(sen), 'senators,', len(asm), 'assembly,', len(cc), 'council,', len(house), 'house')
