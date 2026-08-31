import { mapBirthdaysOn, dayKey, address } from '../lib/venues.js';

export function GET() {
  const today = new Date();
  const body = {
    date: today.toISOString().slice(0, 10),
    day: dayKey(today),
    source: 'OpenStreetMap, © OpenStreetMap contributors, ODbL',
    venues: mapBirthdaysOn(today).map((v) => ({
      name: v.name,
      osm: v.key,
      amenity: v.amenity,
      address: address(v),
      lat: v.lat,
      lon: v.lon,
      onMapSince: v.createdAt,
      yearsOnMap: v.yearsOnMap,
      startDate: v.startDate ? { value: v.startDate.raw, precision: v.startDate.precision } : null,
    })),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
