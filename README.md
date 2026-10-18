# popny.org

Pages for Providers Organized for Power (POP), served by GitHub Pages at popny.org.

- `dec2/`: registration form for the Dec 2 Pay Our Providers launch (popny.org/dec2)
- `pay/`: Pay Our Providers campaign page (popny.org/pay)
- `pay/toolkit/`: social media kit, one-pagers and launch flyer (popny.org/pay/toolkit)
- `pay/endorse/`: endorsement form (popny.org/pay/endorse)
- `index.html`: sends visitors to popchildcare.org for now

Each folder is one page: add `name/index.html` and it's live at popny.org/name.

## Rebuilding the toolkit files

The social graphics (`pay/toolkit/social/*.png`) and one-pager PDFs (`pay/toolkit/onepagers/*.pdf`) are rendered from HTML.
Edit `tools/pay-toolkit/cards.html` or `pay/toolkit/onepagers/*.html`, then from the repo root:

```
python3 -m http.server 8765 &
node tools/pay-toolkit/render.js   # needs Playwright (set PLAYWRIGHT=/path/to/playwright if it isn't resolvable)
```

## Endorsement form

`pay/endorse/` sends each endorsement to a Google Sheet and saves the logo to a Google Drive folder.
To turn it on, paste `pay/endorse/google-sheet-script.gs` into a Google Sheet's Apps Script, deploy it as a web app
(Execute as: Me, Who has access: Anyone), and put the `/exec` URL into `SUBMIT_URL` in `pay/endorse/index.html`.
Until then the form shows its thank-you screen without sending anything.
