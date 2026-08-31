// Pulls the Ontario venue list from Overpass. Run nightly; the result is derived
// and not committed. Note `out tags center` — the feed needs names and coords,
// so the `out ids` form in the README is not enough.
//
// Overpass is a free public service under constant load and it does time out;
// a 504 took the build down once. Since this runs unattended overnight, one bad
// response must not cost a night's deploy: each endpoint is retried with a
// growing pause, then the next mirror is tried.
import fs from 'node:fs';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const ATTEMPTS_PER_ENDPOINT = 3;
const UA = 'barbirthday.com/0.1 (toronto@comentality.com)';

const query = fs.readFileSync('scripts/ontario-venues.overpassql', 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchVenues() {
  const failures = [];
  for (const endpoint of ENDPOINTS) {
    for (let attempt = 1; attempt <= ATTEMPTS_PER_ENDPOINT; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(240000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const body = await res.json();
        // A short answer usually means a truncated or partial result rather than
        // Ontario losing 800 pubs overnight. Treat it as a failure, not as data.
        if (!Array.isArray(body.elements) || body.elements.length < 1000) {
          throw new Error(`only ${body.elements?.length ?? 0} elements`);
        }
        console.log(`fetched ${body.elements.length} venues from ${new URL(endpoint).host}`);
        return body;
      } catch (err) {
        const reason = `${new URL(endpoint).host} attempt ${attempt}: ${err.message ?? err}`;
        console.warn(`  ${reason}`);
        failures.push(reason);
        if (attempt < ATTEMPTS_PER_ENDPOINT) await sleep(attempt * 20000);
      }
    }
  }
  throw new Error(`every Overpass endpoint failed —\n  ${failures.join('\n  ')}`);
}

const body = await fetchVenues();
fs.writeFileSync('data/ontario-venues.raw.json', JSON.stringify(body));
