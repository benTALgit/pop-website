"""Lay the redrawn demand columns (tools/pay-toolkit/flyer-demands.html) over the Dec 2 flyer files.

Same approach as patch-flyer-band.py: the flyer has no HTML source here, so we draw only the two
demand columns and stamp them on each page. The old columns' text is deleted from the PDFs first so the
stale figures ($1.2B / $1,200 millones) aren't left underneath for copy-paste, search or screen readers.

Steps (from the repo root):
  1. Serve the repo:  python3 -m http.server 8765
  2. Render flyer-demands.html (and ?lang=es) with headless Chrome into a folder as
       demands-en.pdf, demands-es.pdf  (8.5x11in, printBackground)
       demands-en.png, demands-es.png  (screenshot 816x1056 at deviceScaleFactor 1275/816, omitBackground)
  3. python3 tools/pay-toolkit/patch-flyer-demands.py <that folder> [git rev of the originals, default main]

Nov 27, 2026: CCAP estimate $1.2B -> $2B; both figures moved below their descriptions, smaller.
"""
import io
import subprocess
import sys
from pathlib import Path

from PIL import Image
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, NameObject

SRC = Path(sys.argv[1])
REV = sys.argv[2] if len(sys.argv) > 2 else 'main'
FLYER = Path('pay/toolkit/flyer')

# Text placed by Chrome in CSS px (816 x 1056 per page; Spanish side one page-height lower). The columns'
# text sits between y = 615 and 800; the section heading above (600 / 605) is kept.
COL_Y = (615, 800)
# An earlier patch drew the $2B / $2,000 millones figure with these fonts, in PDF points.
PATCH_FONTS = {'/U800', '/U600'}


def original(name):
    return subprocess.run(['git', 'show', f'{REV}:{FLYER / name}'], check=True, capture_output=True).stdout


def strip_columns(writer, page):
    cs = ContentStream(page.get_contents(), writer)
    out, block, removed = [], None, 0
    for operands, op in cs.operations:
        if op == b'BT':
            block = [(operands, op)]
        elif block is not None:
            block.append((operands, op))
            if op == b'ET':
                ys = [float(a[5]) % 1056 for a, o in block if o == b'Tm']
                fonts = {str(a[0]) for a, o in block if o == b'Tf'}
                if (ys and all(COL_Y[0] < y < COL_Y[1] for y in ys)) or (fonts and fonts <= PATCH_FONTS):
                    removed += 1
                else:
                    out.extend(block)
                block = None
        else:
            out.append((operands, op))
    cs.operations = out
    page[NameObject('/Contents')] = writer._add_object(cs)
    return removed


def patch_pdf(name, langs):
    reader = PdfReader(io.BytesIO(original(name)))
    writer = PdfWriter()
    writer.append(reader)
    for page, lang in zip(writer.pages, langs):
        removed = strip_columns(writer, page)
        print(' ', name, lang, 'text blocks removed:', removed)
        over = PdfReader(SRC / f'demands-{lang}.pdf').pages[0]
        assert [round(float(x)) for x in over.mediabox] == [round(float(x)) for x in page.mediabox]
        page.merge_page(over)
    writer.add_metadata(reader.metadata or {})
    with open(FLYER / name, 'wb') as f:
        writer.write(f)
    print('patched', name)


def patch_jpg(name, lang):
    im = Image.open(io.BytesIO(original(name))).convert('RGB')
    over = Image.open(SRC / f'demands-{lang}.png').convert('RGBA')
    assert over.size == im.size, (over.size, im.size)
    im.paste(over, (0, 0), over)
    im.save(FLYER / name, quality=92, optimize=True, dpi=(150, 150))
    print('patched', name)


patch_pdf('pay-our-providers-dec2-flyer-en.pdf', ['en'])
patch_pdf('pay-our-providers-dec2-flyer-es.pdf', ['es'])
patch_pdf('pay-our-providers-dec2-flyer.pdf', ['en', 'es'])
patch_jpg('pay-our-providers-dec2-flyer-en.jpg', 'en')
patch_jpg('pay-our-providers-dec2-flyer-es.jpg', 'es')
patch_jpg('pay-our-providers-dec2-flyer.jpg', 'en')
