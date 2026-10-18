#!/usr/bin/env python3
"""Mark a page's text blocks as editable, and bring text edits made in the preview back into the page.

    python3 tools/preview_edits.py tag pay/index.html
        Adds data-e="N" to each text block (headings, paragraphs, list items, buttons...).
        Safe to re-run: blocks that already have one keep it, new blocks get new numbers.

    python3 tools/preview_edits.py apply pay/index.html edits.json
        edits.json maps data-e ids to new inner HTML, as saved by the preview's "Edit text" mode.
        Replaces each block's contents in place and leaves the rest of the file untouched.
"""
import json
import re
import sys
from html.parser import HTMLParser

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
BLOCKS = {'h1', 'h2', 'h3', 'h4', 'p', 'li', 'figcaption'}
CLASSES = {'t', 'sub', 'tag-main', 'tag-sub', 'btn'}
SPLIT_LISTS = {'people', 'stats', 'ladder', 'hubs'}  # tag each line of these list items, not the whole item
SKIP = {'logos', 'topnav', 'num'}


class Scan(HTMLParser):
    """Records each element's start tag span and, once closed, its inner span."""

    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.text = text
        self.lines = [0]
        for m in re.finditer('\n', text):
            self.lines.append(m.end())
        self.stack = []
        self.elements = []

    def pos_(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        start = self.pos_()
        raw = self.get_starttag_text()
        a = dict(attrs)
        el = {'tag': tag, 'attrs': a, 'classes': set((a.get('class') or '').split()),
              'start': start, 'inner_start': start + len(raw), 'raw': raw,
              'parent': self.stack[-1] if self.stack else None}
        self.elements.append(el)
        if tag not in VOID and not raw.endswith('/>'):
            self.stack.append(el)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]['tag'] == tag:
                self.stack[i]['inner_end'] = self.pos_()
                del self.stack[i:]
                break


def scan(text):
    s = Scan(text)
    s.feed(text)
    s.close()
    return s.elements


def ancestors(el):
    p = el['parent']
    while p:
        yield p
        p = p['parent']


def editable(el):
    if 'inner_end' not in el or el['tag'] in ('script', 'style', 'title'):
        return False
    if any(a['tag'] in ('head', 'nav', 'script') or a['classes'] & SKIP for a in ancestors(el)):
        return False
    if el['classes'] & SKIP:
        return False
    parent = el['parent']
    if el['tag'] == 'li' and parent and parent['classes'] & SPLIT_LISTS:
        return False
    if parent and parent['tag'] == 'li' and parent['parent'] and parent['parent']['classes'] & SPLIT_LISTS:
        return el['tag'] in ('b', 'span') and 'badge' not in el['classes']
    if el['tag'] == 'span' and el['attrs'].get('role') == 'cell':
        return True
    return el['tag'] in BLOCKS or bool(el['classes'] & CLASSES)


def tag(path):
    text = open(path, encoding='utf-8').read()
    els = scan(text)
    used = [int(e['attrs']['data-e']) for e in els if (e['attrs'].get('data-e') or '').isdigit()]
    nxt = max(used, default=0) + 1
    chosen, ids = [], set()
    for el in els:
        if 'data-e' in el['attrs'] or not editable(el):
            continue
        # Only the outermost block is editable, so edits never overlap.
        if any('data-e' in a['attrs'] or id(a) in ids for a in ancestors(el)):
            continue
        chosen.append(el)
        ids.add(id(el))
    out, pos = [], 0
    for el in chosen:
        raw = el['raw']
        cut = len(raw) - (2 if raw.endswith('/>') else 1)
        out.append(text[pos:el['start']] + raw[:cut] + ' data-e="%d"' % nxt + raw[cut:])
        pos = el['start'] + len(raw)
        nxt += 1
    out.append(text[pos:])
    open(path, 'w', encoding='utf-8').write(''.join(out))
    print('%s: tagged %d new blocks' % (path, len(chosen)))


def clean(fragment):
    fragment = fragment.replace('\u00a0', ' ').replace('&nbsp;', ' ')
    fragment = re.sub(r'\s+contenteditable="[^"]*"', '', fragment)
    fragment = re.sub(r'(<br\s*/?>\s*)+$', '', fragment.strip())
    return re.sub(r'[ \t]{2,}', ' ', fragment)


def apply(path, edits_path):
    text = open(path, encoding='utf-8').read()
    edits = json.load(open(edits_path, encoding='utf-8'))
    spans = {}
    for el in scan(text):
        eid = el['attrs'].get('data-e')
        if eid and eid in edits and 'inner_end' in el:
            spans[eid] = (el['inner_start'], el['inner_end'])
    missing = sorted(set(edits) - set(spans), key=lambda k: int(k) if k.isdigit() else 0)
    changed = 0
    for eid, (a, b) in sorted(spans.items(), key=lambda kv: -kv[1][0]):
        new = clean(edits[eid])
        if text[a:b] != new:
            text = text[:a] + new + text[b:]
            changed += 1
    open(path, 'w', encoding='utf-8').write(text)
    print('%s: %d blocks changed' % (path, changed))
    if missing:
        print('not found in this page (skipped): ' + ', '.join(missing))


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == 'tag':
        tag(sys.argv[2])
    elif len(sys.argv) == 4 and sys.argv[1] == 'apply':
        apply(sys.argv[2], sys.argv[3])
    else:
        sys.exit(__doc__)
