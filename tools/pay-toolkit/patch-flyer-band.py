"""Lay a new date band (tools/pay-toolkit/flyer-band.html) over the Dec 2 flyer files.

The flyer has no HTML source in this repo, so instead of rebuilding it we draw only the orange date
band and stamp it on top of each page, leaving the rest of the flyer exactly as it was. The old band's
text is deleted from the PDFs first, so the stale date isn't left underneath (copy-paste, search and
screen readers would still pick it up).

Steps (from the repo root):
  1. Serve the repo:  python3 -m http.server 8765
  2. Render flyer-band.html (and ?lang=es) with headless Chrome into a folder as
       band-en.pdf, band-es.pdf  (page.pdf, 8.5x11in, printBackground)
       band-en.png, band-es.png  (screenshot 816x1056 at deviceScaleFactor 1275/816, omitBackground)
  3. python3 tools/pay-toolkit/patch-flyer-band.py <that folder> [git rev of the originals, default main]

The originals are read from git, so the script is safe to re-run.
Nov 22, 2026: used to show Buffalo on Mon, Nov 30, 5:30-8 PM.
"""
import io
import subprocess
import sys
from pathlib import Path

from PIL import Image
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, NameObject

BAND_DIR = Path(sys.argv[1])
REV = sys.argv[2] if len(sys.argv) > 2 else 'main'
FLYER = Path('pay/toolkit/flyer')

# The PDFs were printed from Chrome, so text is placed in CSS pixels (816 x 1056 per page; the Spanish
# side is drawn one page-height lower). The old band's text sat between y = 508 and 567.
OLD_BAND_Y = (500, 575)


def original(name):
    return subprocess.run(['git', 'show', f'{REV}:{FLYER / name}'], check=True, capture_output=True).stdout


def strip_old_band_text(writer, page):
    cs = ContentStream(page.get_contents(), writer)
    out, block, removed = [], None, 0
    for operands, op in cs.operations:
        if op == b'BT':
            block = [(operands, op)]
        elif block is not None:
            block.append((operands, op))
            if op == b'ET':
                ys = [float(a[5]) % 1056 for a, o in block if o == b'Tm']
                if ys and all(OLD_BAND_Y[0] < y < OLD_BAND_Y[1] for y in ys):
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
        removed = strip_old_band_text(writer, page)
        assert removed == 4, (name, removed)  # date, time, cities, "register" line
        band = PdfReader(BAND_DIR / f'band-{lang}.pdf').pages[0]
        assert [round(float(x)) for x in band.mediabox] == [round(float(x)) for x in page.mediabox]
        page.merge_page(band)
    writer.add_metadata(reader.metadata or {})
    with open(FLYER / name, 'wb') as f:
        writer.write(f)
    print('patched', name)


def patch_jpg(name, lang):
    im = Image.open(io.BytesIO(original(name))).convert('RGB')
    band = Image.open(BAND_DIR / f'band-{lang}.png').convert('RGBA')
    assert band.size == im.size, (band.size, im.size)
    im.paste(band, (0, 0), band)
    im.save(FLYER / name, quality=92, optimize=True, dpi=(150, 150))
    print('patched', name)


patch_pdf('pay-our-providers-dec2-flyer-en.pdf', ['en'])
patch_pdf('pay-our-providers-dec2-flyer-es.pdf', ['es'])
patch_pdf('pay-our-providers-dec2-flyer.pdf', ['en', 'es'])
patch_jpg('pay-our-providers-dec2-flyer-en.jpg', 'en')
patch_jpg('pay-our-providers-dec2-flyer-es.jpg', 'es')
patch_jpg('pay-our-providers-dec2-flyer.jpg', 'en')
