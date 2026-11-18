# popny.org

Pages for Providers Organized for Power (POP), served by GitHub Pages at popny.org.

- `dec2/`: registration form for the Dec 2 Pay Our Providers launch (popny.org/dec2)
- `pay/`: Pay Our Providers campaign page (popny.org/pay)
- `pay/toolkit/`: social media kit, one-pagers and launch flyer (popny.org/pay/toolkit)
- `pay/endorse/`: endorsement form (popny.org/pay/endorse)
- `pay/testify/`, `testify/`, `testifica/`: the Oct 29, 2026 hearing sign-up is over, so these now forward to the campaign page. The page and testimony guide are kept in `archive/oct29-hearing-testify/` (see its README to reuse them for the next hearing)
- `captains/`: the campaign team's district captains map (popchildcare.org/captains), behind a team password. See "District captains" below
- `index.html`: sends visitors to popchildcare.org

popchildcare.org is the main site and serves these same pages. On popny.org, each page forwards to the same path on popchildcare.org, so the short links never show an old copy.

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

## Editing text in the preview

The claude.ai preview of the campaign page has an "Edit text" button. Saved edits land in the preview's
`edits.json` as `{"edits": {"<data-e id>": "<new inner HTML>"}}`. To bring them into the site, save that
`edits` object to a file and run `python3 tools/preview_edits.py apply pay/index.html that-file.json`.
The `data-e` attributes on `pay/index.html` mark the editable blocks; after adding new text, run
`python3 tools/preview_edits.py tag pay/index.html` to number the new blocks. `tools/pay-preview/build.sh`
builds the preview folder.

## District captains

`captains/index.html` is only the page: its look, maps and editing screens. It holds no district or committee data,
because this repo is public. The page asks for the team password, then loads and saves everything through the
popchildcare.org server's `/api/captains` route, which checks the password (the `CAPTAINS_CODE` secret in Replit)
and reads and writes two Airtable tables in the POP base: "District Captains" (one row per target district) and
"Captains Committee Homes" (committee members' home districts, never street addresses).

popchildcare.org serves this file straight from the `main` branch here, so changing the look is just editing
`captains/index.html` and merging; it shows up on the site within about five minutes, with no Replit redeploy.
On popny.org the page forwards to popchildcare.org like the others.
