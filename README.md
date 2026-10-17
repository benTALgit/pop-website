# popny.org

Pages for Providers Organized for Power (POP), served by GitHub Pages at popny.org.

- `dec2/`: registration form for the Dec 2 Pay Our Providers launch (popny.org/dec2)
- `pay/`: Pay Our Providers campaign page (popny.org/pay)
- `pay/toolkit/`: social media kit, one-pagers and launch flyer (popny.org/pay/toolkit)
- `index.html`: sends visitors to popchildcare.org for now

Each folder is one page: add `name/index.html` and it's live at popny.org/name.

## Rebuilding the toolkit files

The social graphics (`pay/toolkit/social/*.png`) and one-pager PDFs (`pay/toolkit/onepagers/*.pdf`) are rendered from HTML.
Edit `tools/pay-toolkit/cards.html` or `pay/toolkit/onepagers/*.html`, then from the repo root:

```
python3 -m http.server 8765 &
node tools/pay-toolkit/render.js   # needs Playwright (set PLAYWRIGHT=/path/to/playwright if it isn't resolvable)
```
