import type { Venue } from './types';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Stockholm bounding box (generous to cover inner suburbs)
const STOCKHOLM_BBOX = '59.25,17.80,59.42,18.25';

const OVERPASS_QUERY = `
[out:json][timeout:30];
(
  node["amenity"~"bar|pub|restaurant|cafe"]["outdoor_seating"="yes"](${STOCKHOLM_BBOX});
  way["amenity"~"bar|pub|restaurant|cafe"]["outdoor_seating"="yes"](${STOCKHOLM_BBOX});
);
out center;
`;

interface OverpassElement {
  type: 'node' | 'way';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export async function fetchStockholmVenues(): Promise<Venue[]> {
  const response = await fetch(
    `${OVERPASS_API}?data=${encodeURIComponent(OVERPASS_QUERY)}`
  );

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  return parseOverpassVenues(data.elements);
}

function parseOverpassVenues(elements: OverpassElement[]): Venue[] {
  return elements
    .filter(el => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      return lat !== undefined && lon !== undefined;
    })
    .map(el => {
      const lat = el.lat ?? el.center!.lat;
      const lng = el.lon ?? el.center!.lon;
      const tags = el.tags ?? {};

      return {
        id: `osm-${el.type}-${el.id}`,
        name: tags.name ?? tags['name:sv'] ?? 'Okänt ställe',
        lat,
        lng,
        type: mapAmenityType(tags.amenity),
        neighborhood: tags['addr:suburb'] ?? tags['addr:district'] ?? guessNeighborhood(lat, lng),
        address: buildAddress(tags),
        openingHours: tags.opening_hours,
        website: tags.website ?? tags['contact:website'],
        cuisine: tags.cuisine,
        phone: tags.phone ?? tags['contact:phone'],
      } satisfies Venue;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}

function mapAmenityType(amenity?: string): Venue['type'] {
  switch (amenity) {
    case 'bar': return 'bar';
    case 'pub': return 'pub';
    case 'cafe': return 'cafe';
    default: return 'restaurant';
  }
}

function buildAddress(tags: Record<string, string>): string | undefined {
  const street = tags['addr:street'];
  const number = tags['addr:housenumber'];
  if (street && number) return `${street} ${number}`;
  if (street) return street;
  return undefined;
}

// Rough neighborhood guess based on coordinates
function guessNeighborhood(lat: number, lng: number): string {
  if (lat < 59.31 && lng > 18.04) return 'Södermalm';
  if (lat >= 59.31 && lat < 59.325 && lng >= 18.04 && lng <= 18.08) return 'Gamla Stan';
  if (lat > 59.34 && lng > 18.06) return 'Östermalm';
  if (lat > 59.34 && lng <= 18.06) return 'Vasastan';
  if (lat <= 59.34 && lng < 18.04) return 'Kungsholmen';
  if (lng > 18.09) return 'Djurgården';
  return 'Stockholm';
}
