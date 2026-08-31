// Fetches the v1 (creation) timestamp for every Ontario venue from the OSM API.
// A v1 timestamp never changes, so this cache is permanent: re-runs only fetch
// element ids that are not already in it. Sequential and polite on purpose.
import fs from 'node:fs';

const UA = 'barbirthday.com/0.1 (toronto@comentality.com)';
const DELAY_MS = 150;
const CACHE = 'data/created.jsonl';

const venues = JSON.parse(fs.readFileSync('data/ontario-venues.raw.json', 'utf8')).elements;

const seen = new Set();
if (fs.existsSync(CACHE)) {
  for (const line of fs.readFileSync(CACHE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { seen.add(JSON.parse(line).key); } catch {}
  }
}

const todo = venues.filter((v) => !seen.has(`${v.type}/${v.id}`));
console.log(`${venues.length} venues, ${seen.size} cached, ${todo.length} to fetch`);

const out = fs.createWriteStream(CACHE, { flags: 'a' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ok = 0;
let failed = 0;

for (const [i, v] of todo.entries()) {
  const key = `${v.type}/${v.id}`;
  let record = null;
  for (let attempt = 0; attempt < 3 && !record; attempt++) {
    try {
      const res = await fetch(`https://api.openstreetmap.org/api/0.6/${v.type}/${v.id}/1.json`, {
        headers: { 'User-Agent': UA },
      });
      if (res.status === 404 || res.status === 410) {
        record = { key, error: `http ${res.status}` };
        break;
      }
      if (!res.ok) throw new Error(`http ${res.status}`);
      const body = await res.json();
      const el = body.elements?.[0];
      if (!el?.timestamp) throw new Error('no timestamp in v1');
      record = { key, created: el.timestamp, user: el.user ?? null };
    } catch (err) {
      if (attempt === 2) record = { key, error: String(err.message ?? err) };
      else await sleep(1000 * (attempt + 1));
    }
  }
  if (record.error) failed++; else ok++;
  out.write(JSON.stringify(record) + '\n');
  if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${todo.length}  ok=${ok} failed=${failed}`);
  await sleep(DELAY_MS);
}

out.end();
console.log(`done: ok=${ok} failed=${failed}`);
