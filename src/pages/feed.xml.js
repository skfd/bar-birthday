import { mapBirthdaysOn, dayKey, address } from '../lib/venues.js';

const escape = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

export function GET(context) {
  const today = new Date();
  const site = context.site ?? new URL('https://example.com');
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const link = (path) => new URL(`${base}${path}`, site).href;
  const todays = mapBirthdaysOn(today);

  const items = todays
    .map((v) => {
      const where = address(v);
      return `    <item>
      <title>${escape(v.name)} — ${v.yearsOnMap} years on the map</title>
      <link>${escape(link(`/add/${v.slug}/`))}</link>
      <guid isPermaLink="false">${escape(`${v.key}#${dayKey(today)}-${today.getUTCFullYear()}`)}</guid>
      <pubDate>${today.toUTCString()}</pubDate>
      <description>${escape(
        `${v.name}${where ? ` (${where})` : ''} has been on OpenStreetMap since ${v.createdAt.slice(0, 10)} — ${v.yearsOnMap} years ago today.`,
      )}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Bar Birthday — on the map since</title>
    <link>${escape(link('/'))}</link>
    <atom:link href="${escape(link('/feed.xml'))}" rel="self" type="application/rss+xml" />
    <description>Ontario bars and pubs whose OpenStreetMap birthday falls today.</description>
    <language>en-ca</language>
    <lastBuildDate>${today.toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
