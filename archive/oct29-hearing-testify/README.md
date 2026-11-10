# Testify sign-up (Oct 29, 2026 Council hearing), archived

This is the "sign up to testify" page and the 2-minute testimony guide we used for the
Oct 29, 2026 City Council hearing on the business of child care (late payments).
The hearing has passed, so the page came down on Nov 10, 2026. The old addresses
(popchildcare.org/campaign/testify, popny.org/testify, popny.org/testifica) now go to the campaign page.

The files are kept here so the structure can be reused for the next hearing.
They are not linked from anywhere, and their relative links (`../site-nav.css`, `../pay.css`,
`../assets/testify-hero.jpg`, `../../dec2/` etc.) only work once they're back in `pay/testify/`.

## Reusing it for a new hearing

1. Copy `index.html` back to `pay/testify/index.html` and `script/index.html` to `pay/testify/script/index.html`
   (replacing the redirect stubs there).
2. Update the hearing details in both pages, English and Spanish strings: date, time, place,
   committees and chairs, Council hearing name in the copy-paste hand-off, interpretation deadline,
   the "why" section and talking points, and the page titles / share text. Make a new share image
   (`pay/assets/testify-share.png`, `testify-guide-share.png`) and header photo if needed.
3. Make a new Event in Airtable for the hearing and point the server route at it: the Replit
   route `/api/testify` (server/routes.ts) saves to the Registrations table (by table ID) linked to
   the Oct 29 Event record. Change that Event record ID to the new one. Add a view for it on Registrations.
4. Put the Testify tab back in the campaign sub-nav (`pay/index.html`, `pay/toolkit/`, `pay/endorse/`,
   `dec2/` incl. its Spanish `navTestify: 'Testificar'` string), and turn the `testify/` and `testifica/`
   short links back into forwards to `/campaign/testify/` (`?lang=es` for testifica).
5. Add the hearing to `eventItems` on the Replit Events page (client/src/pages/Media.tsx). An "upcoming"
   item drops off the Events page and the homepage by itself after its date.
6. Merge to main (for popny.org), re-sync `pay/` to Replit `client/public/pay`, test the live form once
   with a TEST entry and delete it, then publish.
