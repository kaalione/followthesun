import SunCalc from 'suncalc';

export interface SunPosition {
  azimuth: number;    // radians, from south clockwise
  altitude: number;   // radians, above horizon
  isAboveHorizon: boolean;
}

export function getSunPositionForShadow(date: Date, lat: number, lng: number): SunPosition {
  const pos = SunCalc.getPosition(date, lat, lng);
  return {
    azimuth: pos.azimuth,
    altitude: pos.altitude,
    isAboveHorizon: pos.altitude > 0,
  };
}

export interface Building {
  footprint: [number, number][];  // [lng, lat] coordinates
  height: number;                  // meters
}

/**
 * Checks if a point [lng, lat] is in shadow cast by surrounding buildings
 * given the sun's position.
 *
 * Algorithm:
 * 1. Cast a ray from the point toward the sun (opposite azimuth direction)
 * 2. For each building the ray intersects: compute shadow length
 * 3. If the point is within shadow length -> in shadow
 */
export function isPointInShadow(
  point: [number, number],       // [lng, lat]
  sunPosition: SunPosition,
  buildings: Building[],
): boolean {
  if (!sunPosition.isAboveHorizon) return true; // night

  const { azimuth, altitude } = sunPosition;

  // Sun direction on ground (vector from point toward sun)
  // SunCalc azimuth: 0 = south, positive = west
  const sunDirX = Math.sin(azimuth);
  const sunDirY = Math.cos(azimuth);

  // Meters per degree (approximation for Stockholm ~59°N)
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((point[1] * Math.PI) / 180);

  for (const building of buildings) {
    const intersection = getRayBuildingIntersection(
      point,
      [sunDirX, sunDirY],
      building.footprint,
      metersPerDegLat,
      metersPerDegLng,
    );

    if (intersection !== null) {
      // Shadow length = building_height / tan(sun_altitude)
      const shadowLength = building.height / Math.tan(altitude);

      if (intersection.distance < shadowLength) {
        return true; // point is within the shadow
      }
    }
  }

  return false;
}

/**
 * Returns the distance to a building's nearest edge along the ray,
 * or null if the ray doesn't hit the building.
 */
function getRayBuildingIntersection(
  origin: [number, number],
  direction: [number, number],
  footprint: [number, number][],
  metersPerDegLat: number,
  metersPerDegLng: number,
): { distance: number } | null {
  // Convert footprint to meter coordinates relative to origin
  const localFootprint = footprint.map(([lng, lat]) => [
    (lng - origin[0]) * metersPerDegLng,
    (lat - origin[1]) * metersPerDegLat,
  ] as [number, number]);

  let minDistance = Infinity;
  let hit = false;

  // Test each edge of the building polygon
  for (let i = 0; i < localFootprint.length; i++) {
    const a = localFootprint[i];
    const b = localFootprint[(i + 1) % localFootprint.length];

    const t = raySegmentIntersection([0, 0], direction, a, b);
    if (t !== null && t > 0.5) { // t > 0.5m = skip the building the point is inside
      hit = true;
      minDistance = Math.min(minDistance, t);
    }
  }

  return hit ? { distance: minDistance } : null;
}

/**
 * 2D ray-segment intersection.
 * Returns t (distance along ray) or null.
 */
function raySegmentIntersection(
  rayOrigin: [number, number],
  rayDir: [number, number],
  segA: [number, number],
  segB: [number, number],
): number | null {
  const dx = segB[0] - segA[0];
  const dy = segB[1] - segA[1];

  const denom = rayDir[0] * dy - rayDir[1] * dx;
  if (Math.abs(denom) < 1e-10) return null; // parallel

  const t = ((segA[0] - rayOrigin[0]) * dy - (segA[1] - rayOrigin[1]) * dx) / denom;
  const u = ((segA[0] - rayOrigin[0]) * rayDir[1] - (segA[1] - rayOrigin[1]) * rayDir[0]) / denom;

  if (t >= 0 && u >= 0 && u <= 1) return t;
  return null;
}

function getPolygonCenter(coords: [number, number][]): [number, number] {
  const lngSum = coords.reduce((sum, c) => sum + c[0], 0);
  const latSum = coords.reduce((sum, c) => sum + c[1], 0);
  return [lngSum / coords.length, latSum / coords.length];
}

/**
 * Batch sun-status check for a list of venues.
 * Extracts building data from MapLibre's vector tiles.
 */
export function checkVenuesSunStatus(
  venues: Array<{ id: string; lat: number; lng: number }>,
  buildings: Building[],
  date: Date,
  centerLat: number,
  centerLng: number,
): Map<string, boolean> {
  const results = new Map<string, boolean>();

  const sunPos = getSunPositionForShadow(date, centerLat, centerLng);

  if (!sunPos.isAboveHorizon) {
    // Night — all venues in darkness
    venues.forEach(v => results.set(v.id, false));
    return results;
  }

  // Max search radius in meters — at 5° altitude: 30m / tan(5°) ≈ 343m
  const maxSearchRadius = 300;
  const metersPerDegLat = 111320;

  for (const venue of venues) {
    // Filter nearby buildings for this venue
    const nearbyBuildings = buildings.filter(b => {
      const bCenter = getPolygonCenter(b.footprint);
      const distLat = (bCenter[1] - venue.lat) * metersPerDegLat;
      const distLng = (bCenter[0] - venue.lng) * metersPerDegLat * Math.cos((venue.lat * Math.PI) / 180);
      return Math.sqrt(distLat ** 2 + distLng ** 2) < maxSearchRadius;
    });

    const inShadow = isPointInShadow(
      [venue.lng, venue.lat],
      sunPos,
      nearbyBuildings,
    );

    results.set(venue.id, !inShadow);
  }

  return results;
}

/**
 * Extract Building objects from MapLibre vector tile features.
 * Call with map.querySourceFeatures() result.
 */
export function extractBuildingsFromFeatures(features: any[]): Building[] {
  return features
    .filter((f: any) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
    .map((f: any) => {
      const height =
        f.properties?.render_height ||
        f.properties?.height ||
        (f.properties?.building_levels || f.properties?.levels || 3) * 3.5;

      const coords =
        f.geometry.type === 'Polygon'
          ? f.geometry.coordinates[0]
          : f.geometry.coordinates[0][0];

      return {
        footprint: coords as [number, number][],
        height: Number(height) || 9, // fallback 9m (3 floors)
      };
    });
}
