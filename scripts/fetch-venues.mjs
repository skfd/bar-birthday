// Pulls the Ontario venue list from Overpass. Run nightly; the result is derived
// and not committed. Note `out tags center` — the feed needs names and coords,
// so the `out ids` form in the README is not enough.
import fs from 'node:fs';

const query = fs.readFileSync('scripts/ontario-venues.overpassql', 'utf8');
const res = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: {
    'User-Agent': 'barbirthday.com/0.1 (toronto@comentality.com)',
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({ data: query }),
});
if (!res.ok) throw new Error(`Overpass returned ${res.status}`);

const body = await res.json();
if (!Array.isArray(body.elements) || body.elements.length < 1000) {
  throw new Error(
    `Overpass returned ${body.elements?.length ?? 0} elements — refusing to overwrite the cache with a short result`,
  );
}
fs.writeFileSync('data/ontario-venues.raw.json', JSON.stringify(body));
console.log(`fetched ${body.elements.length} venues`);
