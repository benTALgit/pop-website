# Writes pay/zips.json: every NY zip -> map position, using the same projection as make-map.js.
# NYC zips get inset coordinates and a trailing 1.
import json, math, zipcodes
k = math.cos(42.8 * math.pi / 180)
def mkproj(lon0, lon1, lat0, lat1, x0, y0, w):
    s = w / ((lon1 - lon0) * k)
    return lambda lo, la: (x0 + (lo - lon0) * k * s, y0 + (lat1 - la) * s)
W = 640
P = mkproj(-79.9, -71.8, 40.45, 45.05, 10, 10, W - 20)
H = math.ceil(P(-79.9, 40.45)[1]) + 10
ix, iy, iw = 8, H - 188, 186
Q = mkproj(-74.27, -73.68, 40.48, 40.93, ix + 16, iy + 24, iw - 32)
NYC = {'New York County', 'Kings County', 'Queens County', 'Bronx County', 'Richmond County'}
out = {}
for z in zipcodes.filter_by(state='NY'):
    lo, la = float(z['long']), float(z['lat'])
    if not lo: continue
    if z['county'] in NYC:
        x, y = Q(lo, la); out[z['zip_code']] = [round(x, 1), round(y, 1), 1]
    else:
        x, y = P(lo, la); out[z['zip_code']] = [round(x, 1), round(y, 1)]
json.dump(out, open('pay/zips.json', 'w'), separators=(',', ':'))
print(len(out), H)
