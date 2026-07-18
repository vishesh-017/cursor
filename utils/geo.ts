import type { Ward } from "@/types";

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rough Ahmedabad metro bounds for soft validation. */
export function isNearAhmedabad(lat: number, lng: number): boolean {
  return lat >= 22.85 && lat <= 23.25 && lng >= 72.35 && lng <= 72.8;
}

export function nearestWard(
  lat: number,
  lng: number,
  wards: Ward[]
): Ward | null {
  if (!wards.length) return null;
  let best: Ward | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const ward of wards) {
    const d = haversineMeters(
      { lat, lng },
      { lat: ward.center.lat, lng: ward.center.lng }
    );
    if (d < bestDist) {
      bestDist = d;
      best = ward;
    }
  }
  return best;
}
