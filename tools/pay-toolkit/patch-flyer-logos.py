"""Add endorser logos to the Dec 2 flyer PDFs (EN, ES and the combined file).

The flyer has no HTML source, so this re-lays the logo grid in place: it removes the 18 logo images
from the bottom band of each page and puts them back (same order, PER per row, size S)
with the new logos from NEW appended at the end. Nothing else on the page changes.
Run from the repo root on the ORIGINAL PDFs (git checkout them first); it writes <file>.new.
Then paste the new logo band into the JPGs (render page 1 at 150 dpi, copy box 100,1480-930,1620).
Nov 25, 2026: used to add Hamilton-Madison House, WNY Child Care Action Team and All Our Kin.
The ORIGINAL (18-logo) files are at commit d766962: git show d766962:<path> > <path>.
"""
import sys, io
import pymupdf as fitz
from PIL import Image
NEW = ['pay/assets/logos/hmh.png', 'pay/assets/logos/wnyccat.png', 'pay/assets/logos/aok.png']
PER = 11  # logos per row
S = 0.84
X0, X1 = 50.0, 448.0
ROWY = [727.5, 760.5]
def patch(path):
    d = fitz.open(path)
    for p in d:
        infos = [i for i in p.get_image_info(xrefs=True) if i['bbox'][1] > 700 and i['bbox'][2] < 450]
        assert len(infos) == 18, (path, len(infos))
        infos.sort(key=lambda i: (i['bbox'][1] > 745, i['bbox'][0]))
        items = [('x', i['xref'], fitz.Rect(i['bbox'])) for i in infos]
        # new logos: size like neighbours (max w 40.5, max h 27)
        for f in NEW:
            w, h = Image.open(f).size
            if w / h > 1.5: W = 40.5; H = W * h / w
            else: H = 27.0; W = H * w / h
            items.append(('f', f, fitz.Rect(0, 0, W, H)))
        # remove old logos
        p.add_redact_annot(fitz.Rect(X0 - 4, 706, X1 + 2, 786), fill=False)
        p.apply_redactions(images=fitz.PDF_REDACT_IMAGE_REMOVE, graphics=fitz.PDF_REDACT_LINE_ART_NONE, text=fitz.PDF_REDACT_TEXT_NONE)
        slot = (X1 - X0) / PER
        for n, (kind, src, r) in enumerate(items):
            row, col = divmod(n, PER)
            w, h = r.width * S, r.height * S
            cx = X0 + slot * (col + .5); cy = ROWY[row]
            rect = fitz.Rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
            if kind == 'x': p.insert_image(rect, xref=src)
            else: p.insert_image(rect, filename=src)
    d.save(path + '.new', garbage=3, deflate=True)
    d.close()
for f in sys.argv[1:]:
    patch(f)
    print('patched', f)
