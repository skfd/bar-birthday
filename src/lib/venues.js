// Merges the Overpass venue list with the permanent v1-timestamp cache and
// derives everything the site shows. Runs at build time only.
import fs from 'node:fs';
import { parseStartDate } from './start-date.js';

const raw = JSON.parse(fs.readFileSync('data/ontario-venues.raw.json', 'utf8')).elements;

const created = new Map();
for (const line of fs.readFileSync('data/created.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const rec = JSON.parse(line);
  if (rec.created) created.set(rec.key, rec.created);
}

export const venues = raw
  .map((el) => {
    const key = `${el.type}/${el.id}`;
    return {
      key,
      osmType: el.type,
      osmId: el.id,
      name: el.tags?.name ?? null,
      amenity: el.tags?.amenity ?? null,
      city: el.tags?.['addr:city'] ?? null,
      street: el.tags?.['addr:street'] ?? null,
      housenumber: el.tags?.['addr:housenumber'] ?? null,
      website: el.tags?.website ?? el.tags?.['contact:website'] ?? null,
      lat: el.lat ?? el.center?.lat ?? null,
      lon: el.lon ?? el.center?.lon ?? null,
      createdAt: created.get(key) ?? null,
      startDate: el.tags?.start_date ? parseStartDate(el.tags.start_date) : null,
      slug: slugify(el.tags?.name, el.type, el.id),
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      editUrl: `https://www.openstreetmap.org/edit?${el.type}=${el.id}`,
    };
  })
  .filter((v) => v.name && v.createdAt);

/**
 * Venues whose OSM creation date falls on a given month and day, with ages
 * counted against `refYear`. Never empty for 360 of the 366 days.
 */
export function mapBirthdaysForDay(month, day, refYear) {
  return venues
    .filter((v) => {
      const c = new Date(v.createdAt);
      return c.getUTCMonth() + 1 === month && c.getUTCDate() === day;
    })
    .map((v) => ({ ...v, yearsOnMap: refYear - new Date(v.createdAt).getUTCFullYear() }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Venues whose OSM creation date falls on the given date's month/day. */
export function mapBirthdaysOn(date) {
  return mapBirthdaysForDay(date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCFullYear());
}

const pad = (n) => String(n).padStart(2, '0');

/** `MM-DD` for a date — the key a day permalink is addressed by. */
export function dayKey(date) {
  return `${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * Every `MM-DD` in a calendar year, in order. 2024 is used purely as a leap year
 * so that 29 February gets a page like any other day.
 */
export const allDayKeys = (() => {
  const keys = [];
  const d = new Date(Date.UTC(2024, 0, 1));
  while (d.getUTCFullYear() === 2024) {
    keys.push(dayKey(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return keys;
})();

/** Human label for a `MM-DD`, e.g. "31 August". */
export function dayLabel(md) {
  const [m, d] = md.split('-').map(Number);
  return new Date(Date.UTC(2024, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

/** The tier above the feed: venues carrying a real `start_date`. */
export const realBirthdays = venues
  .filter((v) => v.startDate && v.startDate.precision !== 'none')
  .sort((a, b) => (a.startDate.year ?? 9999) - (b.startDate.year ?? 9999));

/** Venues added to OSM in the last `days` days. */
export function newOnTheMap(date, days = 30) {
  const cutoff = new Date(date.getTime() - days * 86400000).toISOString();
  return venues.filter((v) => v.createdAt >= cutoff).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function address(v) {
  const street = [v.housenumber, v.street].filter(Boolean).join(' ');
  return [street, v.city].filter(Boolean).join(', ') || null;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function slugify(name, type, id) {
  const base = String(name ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  // The osm id keeps slugs unique across same-named pubs, of which Ontario has plenty.
  return `${base || 'bar'}-${type.charAt(0)}${id}`;
}
