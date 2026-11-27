"""Change the CCAP figure on the back of the POP one-pager PDF from $1.2B to $2B est. (Nov 27, 2026).

The one-pager has no HTML source in this repo. An earlier patch (commit 9446a1f) drew the wage-scale
figure "$2B est." on the left card with embedded Unbounded glyphs over a white cover box. This script
copies that same drawing to the right (CCAP) card, shifted right, and removes the old "$1.2B est." text
underneath so it isn't searchable. Run from the repo root; it reads the original from git.
  python3 tools/pay-toolkit/patch-onepager-ccap.py [git rev, default main]
"""
import io
import subprocess
import sys

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, FloatObject, NameObject

REV = sys.argv[1] if len(sys.argv) > 1 else 'main'
NAME = 'pay/toolkit/one-pager/pop-pay-our-providers-one-pager.pdf'
# Left figure starts at x = 62.7 CSS px, the old right one at 430.7: 368 px = 276 pt.
DX = (430.7 - 62.656) * 0.75

reader = PdfReader(io.BytesIO(subprocess.run(['git', 'show', f'{REV}:{NAME}'], check=True, capture_output=True).stdout))
writer = PdfWriter()
writer.append(reader)
page = writer.pages[1]
cs = ContentStream(page.get_contents(), writer)
ops = cs.operations

# 1. The earlier left-card patch: from its white cover box to the end of the stream.
start = next(i for i, (a, o) in enumerate(ops) if o == b're' and abs(float(a[0]) - 46.49219) < 0.01 and abs(float(a[1]) - 546.4543) < 0.01) - 1
assert ops[start][1] == b'q'
patch = ops[start:]
assert sum(1 for a, o in patch if o == b'Tf' and str(a[0]) == '/U800') == 8

# 2. Drop the old right-card "$1.2B est." text (Chrome-placed, flipped Tm, y = 326 px on page 2).
out, block, removed = [], None, 0
for operands, op in ops[:start]:
    if op == b'BT':
        block = [(operands, op)]
    elif block is not None:
        block.append((operands, op))
        if op == b'ET':
            tms = [a for a, o in block if o == b'Tm']
            if tms and all(abs(float(a[5]) % 1056 - 326) < 1 and float(a[4]) > 420 for a in tms):
                removed += 1
            else:
                out.extend(block)
            block = None
    else:
        out.append((operands, op))
assert removed >= 2, removed

# 3. Re-add the left patch, then a copy shifted onto the right card.
shifted = []
for operands, op in patch:
    if op == b'Tm':
        operands = list(operands[:4]) + [FloatObject(float(operands[4]) + DX), operands[5]]
    elif op == b're':
        operands = [FloatObject(float(operands[0]) + DX)] + list(operands[1:])
    shifted.append((operands, op))
cs.operations = out + patch + shifted
page[NameObject('/Contents')] = writer._add_object(cs)
writer.add_metadata(reader.metadata or {})
with open(NAME, 'wb') as f:
    writer.write(f)
print('removed', removed, 'text blocks; patched', NAME)
