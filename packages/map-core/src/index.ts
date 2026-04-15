export const STOCKHOLM_CENTER = {
  lat: 59.3293,
  lng: 18.0686,
} as const;

export const MAP_CONFIG = {
  initialCenter: [STOCKHOLM_CENTER.lng, STOCKHOLM_CENTER.lat] as [number, number],
  initialZoom: 13,
  minZoom: 11,
  maxZoom: 19,
  maxBounds: [
    [17.75, 59.20] as [number, number],
    [18.40, 59.45] as [number, number],
  ] as [[number, number], [number, number]],
} as const;

export function getMapStyle(apiKey: string): string {
  return `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`;
}
