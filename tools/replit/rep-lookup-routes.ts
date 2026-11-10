// Routes for the "Are your reps supporting POP?" lookup on /campaign/ (pay/reps/reps.js).
// To add to the Replit app (server/routes.ts), paste the two route blocks below inside registerRoutes(),
// next to /api/champion, plus the constants at the top of the file. They reuse popPledgeCors and
// popPledgeAirtableRequest, which already exist there.
//
//   GET  /api/reps/lookup?address=...   address -> districts, via the US Census geocoder (no key needed)
//   GET  /api/reps/officials            every Active row of Airtable "Elected Officials" (emails, phones, champion box),
//                                       cached 10 minutes, so staff edit emails/champions in Airtable, not in code
//   POST /api/rep-message               logs a thank-you / ask-to-endorse to Airtable "Rep Messages"
//
// The NYC Council district is looked up in the browser (NYC Planning's council map allows it), so it isn't here.

/* ---------- constants (top of server/routes.ts) ---------- */

const REP_MESSAGES_AIRTABLE_PATH = `/v0/${POP_PLEDGE_AIRTABLE_BASE_ID}/tbl0Q3kKzZ0prCnv2`;
const REP_MESSAGE_FIELDS = {
  name: "fldUilNYMD9scmYUy",
  email: "fldkQWhxTiF6DXR8Q",
  address: "fldIXB1frURbGHXwO",
  zip: "fldGA0D53DntvTMve",
  official: "fldnw9xcFd8b9jO1e",
  office: "fldR4w93bhwGqqfY5",
  district: "fldq6AuFDEvO1cAHj",
  type: "fldjxUWLpuzJUHeU9",
  how: "fldH0wDVfZEHwnTgu",
  champion: "fldjsl27RcKlgE7XD",
  message: "fldDSyyeW3EomDKVU",
  keepPosted: "fldkj58KqabLeLouM",
  language: "fldLTnb5dBwj9k9oD",
  page: "fldrsOGzKRxdjXHNV",
  sentAt: "fldvpnlMstkMlsmKs",
} as const;

const ELECTED_OFFICIALS_AIRTABLE_PATH = `/v0/${POP_PLEDGE_AIRTABLE_BASE_ID}/tblxm4XvlcVQVDkna`;
const OFFICIAL_FIELDS = {
  name: "fldbbm0p2S8W5rJ49",
  office: "fldL4OXSh3fSNpkvB",
  district: "fldppi0l6EsrY6EoX",
  borough: "fldlwGDCCT3m1MBTP",
  champion: "fld1hqGmTOxXV5Muz",
  emails: "fld5EVcE5NPC0RK6W",
  phones: "fldpLXYNh2yA0jXie",
  form: "fldfVfRcVHQllvbbs",
  website: "fldSyt4smNVrWdxgY",
  active: "fldHT0yVWKdjBUuox",
} as const;
let officialsCache: { at: number; data: unknown } | null = null;

/* ---------- routes (inside registerRoutes) ---------- */

  // Officials for the lookup, from Airtable. Emails: one per line. Phones: "(212) 555-1234 | district office", one per line.
  app.options("/api/reps/officials", popPledgeCors);
  app.get("/api/reps/officials", popPledgeCors, async (_req, res) => {
    if (officialsCache && Date.now() - officialsCache.at < 10 * 60 * 1000) {
      return res.json(officialsCache.data);
    }
    const F = OFFICIAL_FIELDS;
    try {
      const rows: any[] = [];
      let offset = "";
      do {
        const q = new URLSearchParams({ pageSize: "100", returnFieldsByFieldId: "true" });
        Object.values(F).forEach((id) => q.append("fields[]", id));
        if (offset) q.set("offset", offset);
        const r = await popPledgeAirtableRequest(`${ELECTED_OFFICIALS_AIRTABLE_PATH}?${q}`, { method: "GET" });
        if (!r.ok) throw new Error(`airtable ${r.status}`);
        const page = (await r.json()) as { records?: any[]; offset?: string };
        rows.push(...(page.records || []));
        offset = page.offset || "";
      } while (offset);

      const lines = (v: unknown) => String(v || "").split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);
      const phoneKind = (label: string) =>
        /albany/i.test(label) ? "albany" : /washington|d\.?c\.?/i.test(label) ? "dc" : /district/i.test(label) ? "district" : "office";
      const FIPS: Record<string, string> = { Bronx: "005", Brooklyn: "047", Manhattan: "061", Queens: "081", "Staten Island": "085" };
      const CITY: Record<string, string> = { Mayor: "mayor", "Public Advocate": "pa", Comptroller: "comptroller" };
      const out: any = {
        ok: true, source: "airtable", updated: new Date().toISOString().slice(0, 10),
        senate: {}, assembly: {}, council: {}, house: {}, ussenate: [], city: [], bp: {},
        champions: { senate: [], assembly: [], council: [], house: [], ussenate: [], city: [], bp: [] },
      };
      for (const rec of rows) {
        const f = rec.fields || {};
        if (!f[F.active] || !f[F.name]) continue;
        const office = typeof f[F.office] === "string" ? f[F.office] : f[F.office]?.name;
        const d = Number(f[F.district]) || 0;
        const o: any = {
          name: String(f[F.name]).trim(),
          emails: lines(f[F.emails]).filter((e) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e)),
          phones: String(f[F.phones] || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
            const [n, label = ""] = l.split("|").map((x) => x.trim());
            return { n, w: phoneKind(label) };
          }).filter((p) => /\d{3}.*\d{4}/.test(p.n)),
          url: f[F.website] || "",
          champ: !!f[F.champion],
        };
        if (f[F.form]) o.form = f[F.form];
        const chamber = office === "NYC Council" ? "council" : office === "State Assembly" ? "assembly"
          : office === "State Senate" ? "senate" : office === "US House" ? "house" : "";
        if (chamber && d) {
          if (chamber === "senate" && o.form) o.formNote = "nysenate";
          out[chamber][d] = o;
          if (o.champ) out.champions[chamber].push(d);
        } else if (office === "US Senate") {
          out.ussenate.push(o);
        } else if (CITY[office]) {
          out.city.push({ key: CITY[office], ...o });
        } else if (office === "Borough President") {
          const boro = typeof f[F.borough] === "string" ? f[F.borough] : f[F.borough]?.name;
          if (FIPS[boro]) out.bp[FIPS[boro]] = { ...o, borough: boro };
        }
      }
      out.ussenate.sort((a: any, b: any) => a.name.split(" ").pop().localeCompare(b.name.split(" ").pop()));
      const order = ["mayor", "pa", "comptroller"];
      out.city.sort((a: any, b: any) => order.indexOf(a.key) - order.indexOf(b.key));
      officialsCache = { at: Date.now(), data: out };
      return res.json(out);
    } catch (err) {
      console.error("Elected Officials read from Airtable failed:", String(err));
      // The page falls back to its bundled officials.js when this fails.
      if (officialsCache) return res.json(officialsCache.data);
      return res.status(502).json({ ok: false });
    }
  });

  app.options("/api/reps/lookup", popPledgeCors);
  app.get("/api/reps/lookup", popPledgeCors, async (req, res) => {
    const address = String(req.query.address || "").trim().slice(0, 200);
    if (address.length < 5) {
      return res.status(400).json({ ok: false, error: "address" });
    }
    const params = new URLSearchParams({
      address,
      benchmark: "Public_AR_Current",
      vintage: "Current_Current",
      layers: "all",
      format: "json",
    });
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?${params}`;
    // The Census geocoder is sometimes slow: give it two tries.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!r.ok) throw new Error(`census ${r.status}`);
        const data = (await r.json()) as any;
        const matches: any[] = data?.result?.addressMatches || [];
        if (!matches.length) return res.json({ ok: true, found: false });
        const m = matches[0];
        const g = m.geographies || {};
        // Layer names carry the year ("2026 State Legislative Districts - Upper", "120th Congressional Districts"),
        // so find them by pattern rather than exact name.
        const layer = (re: RegExp) => {
          const k = Object.keys(g).find((key) => re.test(key));
          return k && g[k] && g[k][0] ? g[k][0] : null;
        };
        const num = (x: any) => (x && x.BASENAME && /^\d+$/.test(x.BASENAME) ? Number(x.BASENAME) : null);
        const state = layer(/^States$/);
        const county = layer(/^Counties$/);
        const cd = layer(/Congressional Districts$/);
        return res.json({
          ok: true,
          found: true,
          matched: m.matchedAddress,
          zip: m.addressComponents?.zip || "",
          lat: m.coordinates?.y,
          lng: m.coordinates?.x,
          state: state?.STUSAB || "",
          countyFips: county?.COUNTY || "",
          county: county?.NAME || "",
          cd: cd?.BASENAME === "0" || /at large/i.test(cd?.NAME || "") ? 0 : num(cd),
          sd: num(layer(/Legislative Districts - Upper$/)),
          ad: num(layer(/Legislative Districts - Lower$/)),
          multiple: matches.length > 1,
        });
      } catch (err) {
        if (attempt === 1) {
          console.error("Rep lookup: Census geocoder failed for", JSON.stringify(address), String(err));
          return res.status(502).json({ ok: false, error: "geocoder" });
        }
      }
    }
  });

  app.options("/api/rep-message", popPledgeCors);
  app.post("/api/rep-message", popPledgeCors, async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ ok: false });
    }
    if (typeof body.website === "string" && body.website.length > 0) {
      return res.json({ ok: true });
    }
    const schema = z.object({
      form: z.literal("rep-message"),
      name: z.string().trim().min(1).max(200),
      email: z.union([z.string().trim().email(), z.literal("")]).optional().default(""),
      address: z.string().max(300).optional().default(""),
      zip: z.string().max(20).optional().default(""),
      official: z.string().trim().min(1).max(200),
      office: z.enum([
        "NYC Council", "State Assembly", "State Senate", "US House", "US Senate",
        "Mayor", "Public Advocate", "Comptroller", "Borough President",
      ]),
      district: z.string().max(100).optional().default(""),
      type: z.enum(["Thank you", "Ask to endorse"]),
      how: z.enum(["Email", "Contact form", "Phone"]),
      champion: z.boolean().optional().default(false),
      message: z.string().max(8000).optional().default(""),
      keep_posted: z.boolean().optional().default(false),
      language: z.enum(["English", "Spanish"]),
      page: z.string().max(500).optional().default(""),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      console.error(
        "Rep message failed validation:", parsed.error.issues[0]?.message,
        "Raw submitted answers:", JSON.stringify(body),
      );
      return res.status(400).json({ ok: false });
    }
    const d = parsed.data;
    const F = REP_MESSAGE_FIELDS;
    const fields: Record<string, unknown> = {
      [F.name]: d.name,
      [F.address]: d.address,
      [F.zip]: d.zip,
      [F.official]: d.official,
      [F.office]: d.office,
      [F.district]: d.district,
      [F.type]: d.type,
      [F.how]: d.how,
      [F.champion]: d.champion,
      [F.message]: d.message,
      [F.keepPosted]: d.keep_posted,
      [F.language]: d.language,
      [F.page]: d.page,
      [F.sentAt]: new Date().toISOString(),
    };
    if (d.email) fields[F.email] = d.email;
    try {
      const r = await popPledgeAirtableRequest(REP_MESSAGES_AIRTABLE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: [{ fields }], typecast: true }),
      });
      if (!r.ok) {
        console.error("Rep message Airtable request failed. Raw submitted answers:", JSON.stringify(body));
        return res.status(502).json({ ok: false });
      }
      const payload = (await r.json()) as { records?: Array<{ id?: string }> };
      return res.status(201).json({ ok: true, id: payload.records?.[0]?.id });
    } catch {
      console.error("Rep message Airtable request threw. Raw submitted answers:", JSON.stringify(body));
      return res.status(502).json({ ok: false });
    }
  });
