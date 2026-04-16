import type { Building, SunPosition } from './shadowEngine';

/**
 * Projects shadow polygons from buildings given sun position.
 *
 * For each building, computes where its shadow falls on the ground:
 * 1. Calculate the shadow offset vector (direction opposite to sun, length = height/tan(altitude))
 * 2. For each vertex of the building footprint, compute its shadow tip
 * 3. Build a shadow polygon from the building footprint + shadow tips (convex hull of both)
 *
 * Returns a GeoJSON FeatureCollection of shadow polygons ready for MapLibre rendering.
 */
export function projectBuildingShadows(
  buildings: Building[],
  sunPosition: SunPosition,
  centerLat: number,
): GeoJSON.FeatureCollection {
  if (!sunPosition.isAboveHorizon) {
    // Night: return a single large polygon covering everything (handled by night overlay instead)
    return { type: 'FeatureCollection', features: [] };
  }

  // Very low sun = extremely long shadows = too many artifacts. Cap it.
  const minAltitude = 0.035; // ~2 degrees
  if (sunPosition.altitude < minAltitude) {
    return { type: 'FeatureCollection', features: [] };
  }

  const { azimuth, altitude } = sunPosition;

  // Shadow direction: opposite of sun direction on the ground
  // SunCalc azimuth: 0 = south, positive = west (clockwise from south)
  // Shadow falls away from the sun, so we negate the direction
  const shadowDirX = -Math.sin(azimuth); // eastward component
  const shadowDirY = -Math.cos(azimuth); // northward component

  // Shadow length per meter of building height
  const shadowLengthPerMeter = 1 / Math.tan(altitude);

  // Cap max shadow length to avoid huge polygons at low sun
  const maxShadowLength = 150; // meters

  // Meters <-> degrees conversion
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);

  const features: GeoJSON.Feature[] = [];

  for (const building of buildings) {
    if (!building.footprint || building.footprint.length < 3) continue;

    const rawShadowLen = building.height * shadowLengthPerMeter;
    const shadowLen = Math.min(rawShadowLen, maxShadowLength);

    // Shadow offset in degrees
    const offsetLng = (shadowDirX * shadowLen) / metersPerDegLng;
    const offsetLat = (shadowDirY * shadowLen) / metersPerDegLat;

    // Create shadow polygon: union of building footprint and its shadow projection
    // We build a "swept" shape: footprint vertices + offset shadow tip vertices
    const footprint = building.footprint;

    // Shadow tip: each footprint vertex projected by the shadow offset
    const shadowTips = footprint.map(([lng, lat]) => [
      lng + offsetLng,
      lat + offsetLat,
    ] as [number, number]);

    // Build the shadow polygon as a convex-hull-like sweep
    // For each edge of the building, we create a quad (trapezoid) connecting
    // the building edge to its shadow projection. Then we merge them by
    // creating the outer boundary: building far side + shadow tips + building near side
    const shadowPolygon = buildSweepPolygon(footprint, shadowTips);

    if (shadowPolygon.length >= 3) {
      // Close the ring
      const ring = [...shadowPolygon, shadowPolygon[0]];

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [ring],
        },
        properties: {
          height: building.height,
          shadowLength: shadowLen,
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Builds a swept shadow polygon from a building footprint and its shadow tips.
 *
 * Strategy: Create the outline by following the footprint forward,
 * then the shadow tips backward. This creates a proper polygon
 * for convex or near-convex building shapes.
 *
 * For a rectangular building, this produces a hexagon:
 *     building edge → shadow tip → shadow edge → shadow tip → building edge
 */
function buildSweepPolygon(
  footprint: [number, number][],
  shadowTips: [number, number][],
): [number, number][] {
  // Simple approach: concatenate footprint + reversed shadow tips
  // This works well for convex shapes and most real buildings
  return [...footprint, ...shadowTips.slice().reverse()];
}

/**
 * Compute shadow opacity based on sun altitude.
 * Higher sun → lighter shadows; lower sun → darker, longer shadows.
 */
export function getShadowOpacity(altitude: number): number {
  // altitude in radians: 0 = horizon, π/2 = zenith
  const altDeg = (altitude * 180) / Math.PI;

  if (altDeg <= 0) return 0;
  if (altDeg < 5) return 0.7;
  if (altDeg < 15) return 0.55;
  if (altDeg < 30) return 0.45;
  if (altDeg < 45) return 0.35;
  return 0.25; // high noon, faint shadows
}

/**
 * Get human-readable sun direction text (Swedish)
 */
export function getSunDirectionText(azimuth: number, altitude: number): string {
  if (altitude <= 0) return 'Under horisonten';

  // SunCalc azimuth: 0 = south, positive = west
  const azDeg = ((azimuth * 180) / Math.PI + 180 + 360) % 360;
  const altDeg = Math.round((altitude * 180) / Math.PI);

  let direction: string;
  if (azDeg >= 337.5 || azDeg < 22.5) direction = 'norr';
  else if (azDeg < 67.5) direction = 'nordost';
  else if (azDeg < 112.5) direction = 'öst';
  else if (azDeg < 157.5) direction = 'sydost';
  else if (azDeg < 202.5) direction = 'söder';
  else if (azDeg < 247.5) direction = 'sydväst';
  else if (azDeg < 292.5) direction = 'väst';
  else direction = 'nordväst';

  return `Solen står i ${direction} (${altDeg}°)`;
}
