# bar-birthday

**Status: v1 scaffold built and building.** The data pipeline runs, the site renders,
the nightly workflow is in place. Not deployed, and the domain is not registered.

```
npm install
node scripts/fetch-venues.mjs      # Overpass -> data/ontario-venues.raw.json (not committed)
node scripts/backfill-created.mjs  # OSM API v1 timestamps -> data/created.jsonl (committed, permanent)
npm run build                      # -> dist/
npm run dev
```

## The goal

A website — the domain in mind is **barbirthday.com** — that celebrates bars by their
birthdays, using OpenStreetMap as the data source. The original idea was "pull data from
OSM to show bar birthdays". Checking the data first changed the shape of that, and the
change is the most important thing on this page.

**What it is not:** it is not a bar directory, not a reviews site, and not a "find a bar
near me" map. There are a hundred of those. This one is about *time* — how long a place has
been standing, and how long it has been on the map.

## What the data actually says

Measured on 2026-08-30 against taginfo, Overpass and the OSM API. Do not re-derive these.

| | count |
|---|---|
| `amenity=bar` worldwide | 243,439 |
| `amenity=pub` worldwide | 199,264 |
| bars/pubs/nightclubs/biergartens **with `start_date`** | **2,753** (~0.6%) |
| …of those, day-precise `YYYY-MM-DD` | 995 (inflated — see caveats) |
| Ontario: bars/pubs/nightclubs/biergartens | **1,856** |
| Ontario: with `start_date` | **18** (~1%) |
| Worldwide with a *future* `start_date` | 20 (none in Ontario) |

The literal concept — "which bars have their birthday today" — does not survive this.
Day-precise records work out to roughly **two bars per day worldwide**, most of them in
Germany (716 of the 995 full dates are in western/central Europe, 142 in the US/Canada).
In Ontario that front page is blank essentially every day of the year.

So the site pivots to a second, denser definition of birthday.

## v1, as decided

**1. The front page is an "on the map since" feed.** Every OSM element has a creation
date — the timestamp of version 1 — and coverage is 100%. Ontario's 1,856 venues spread
across 366 calendar days give **~5 bars per day** whose map-birthday is today. The page is
never empty. Copy reads roughly: *"The Rex has been on the map since 3 December 2009 —
16 years ago today."*

Feasibility is confirmed, not assumed: a random sample of 25 Ontario venues was fetched
from `https://api.openstreetmap.org/api/0.6/{type}/{id}/1.json` and **25/25 returned a v1
timestamp**, spanning 2009–2023 (clusters in 2010 and 2019). Plain Overpass `out meta`
gives *last modified*, not creation — it cannot substitute. But a v1 timestamp never
changes, so it caches permanently: one ~1,856-call backfill, then only newly-appeared
element ids ever cost a request.

**2. Real `start_date` birthdays are a tier above the feed.** Ontario's 18 include The Pilot
(1944), Clark Hall Pub (1971), The Old Sod (1975), Galway Arms (1991). Small, but these are
the ones that deserve a real page.

**3. An add-a-birthday edit flow.** With 1,838 of Ontario's 1,856 venues missing a
`start_date`, the site's long game is making the data exist. Deep-link a bar straight into an
OSM editor with the tag ready to fill.

**4. "New on the map".** Bars added to OSM in the last ~30 days. This replaced an earlier
"opening soon" idea, which had to be cut because only 20 venues on Earth carry a future
`start_date` and none are in Ontario. Same feeling of freshness, real local volume, and it
reuses the v1 pipeline from (1).

**Scope is Ontario for v1.** Global expansion is a later decision, not a v1 flag.

## Data caveats to design around

- **Month-firsts posing as days.** The commonest "birthdays" in the global set are May 1
  (15), Mar 1 (14), Jun 1 (13). Those are month-precision records padded to `-01`. Any
  day-precise feature must not treat them as real days.
- **Free-form values.** 185 of the 2,753 do not parse: `13.09.2025`, `c1880`, `~1990`,
  `1991..1999`, `before 1976`, `2001;2004-02-02`, `traditionally 1368 but first recorded in
  1589`. Ontario's own 18 include four of these. The parser must be forgiving and the UI
  should show how confident it is.
- **`start_date` is ambiguous** — it may describe the *building* rather than the
  *establishment*. A 1600s building can house a bar that opened in 2019. Several of the
  world's pre-1800 entries are almost certainly the building.

## Decisions taken (2026-08-31)

- **Stack: Astro, static output, nightly GitHub Actions build**, deploying to GitHub Pages.
  No backend. `.github/workflows/nightly.yml` fetches Overpass, backfills any newly-appeared
  element ids, commits the cache and deploys.
- **Site shape: the feed plus pages for the 18 real birthdays.** Every venue is a card in the
  "on the map since" feed; only a venue carrying a `start_date` gets its own URL
  (`/bars/{slug}/`). The other 1,838 have nothing to put on a page yet.
- **The v1-timestamp cache is committed**, as `data/created.jsonl`, one JSON object per line.
  A v1 timestamp never changes, so the file only grows. `data/ontario-venues.raw.json` is
  derived and gitignored.
- **Visual register: warm barroom** — low light, brass and amber, warm paper for the type.
- **The parser reports confidence rather than a date it cannot stand behind.** Tiers are
  `day` / `month` / `year` / `approx` / `none`, surfaced as a chip in the UI. Per the caveat
  below, a `YYYY-MM-01` is read as *month* precision and never enters a day-of-year feed.

## Still open

- **How anyone knows it worked.** Contribution counts? Traffic? Neither has a target yet.
- **Whether `start_date` should ever be crowd-sourced on-site** rather than only pushing
  people to the OSM editor. Storing bar facts outside OSM is a real fork in the road.
- **The add-a-birthday flow is currently a bare deep link** to the OSM editor
  (`/edit?node={id}`). It does not pre-fill the `start_date` tag, which would want an iD
  preset link or a josm remote-control call.
- **Global expansion.** Still a later decision, not a v1 flag.

## Queries used (verified working, 2026-08-30)

Ontario venue list:

```
[out:json][timeout:180];
area["name"="Ontario"]["admin_level"="4"]->.o;
(nwr(area.o)["amenity"~"^(bar|pub|nightclub|biergarten)$"];);
out ids;
```

Everything worldwide that already claims a birthday:

```
[out:json][timeout:180];
nwr["amenity"~"^(bar|pub|nightclub|biergarten)$"]["start_date"];
out tags center;
```

Creation date for one element: `GET https://api.openstreetmap.org/api/0.6/{node|way|relation}/{id}/1.json`

## Leads — unverified, evaluate before using

- **Wikidata enrichment.** 225 of the 2,753 global venues carry a `wikidata` tag, which
  could supply photos and founding stories for the oldest ones. Not checked for Ontario
  specifically, and out of v1 scope.
- **The oldest-bars angle** was considered and not chosen for v1: 313 venues predate 1900,
  25 predate 1600, and the list runs Sean's Bar (`900`), Ye Olde Trip to Jerusalem (`1189`),
  The Brazen Head (`1198`). Strong shareable content, but all of it is in Europe and none of
  it is in Ontario. Worth revisiting if scope ever goes global.
- **Geofabrik full-history extracts** were considered as a source for v1 timestamps and are
  not needed — per-element API calls are sufficient at this scale.

## Next steps

- `/gh-init` from inside this folder — the nightly workflow needs a remote and needs Pages
  enabled with source set to GitHub Actions.
- The domain barbirthday.com has not been checked for availability or registered. Nothing in
  the build depends on it; `astro.config.mjs` names it as `site` and would need changing if
  the project lands elsewhere.
- No tests yet. The `start_date` parser is the piece that most wants them — it was checked by
  hand against Ontario's 18 values and the caveats above, not by an automated suite.
