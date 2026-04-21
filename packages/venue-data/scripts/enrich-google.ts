/**
 * Google Places Enrichment Script
 *
 * Reads stockholm-overpass.json (723 venues) and enriches each with
 * Google Places data (rating, price level, photos, place ID).
 *
 * Usage:
 *   GOOGLE_PLACES_API_KEY=your_key npx tsx packages/venue-data/scripts/enrich-google.ts
 *
 * Or set the key in apps/web/.env.local and run:
 *   npx tsx --env-file=apps/web/.env.local packages/venue-data/scripts/enrich-google.ts
 *
 * Features:
 * - Resume support: skips venues already enriched
 * - Rate limiting: 100ms between requests
 * - Proximity matching: only accepts results within 200m
 * - Progress logging with ETA
 */

import * as fs from 'fs';
import * as path from 'path';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error('ERROR: Set GOOGLE_PLACES_API_KEY environment variable');
  process.exit(1);
}

interface Venue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  neighborhood: string;
  address?: string;
  openingHours?: string;
  website?: string;
  cuisine?: string;
  phone?: string;
  sunHoursNote?: string;
  // Google enrichment fields
  googlePlaceId?: string;
  googleRating?: number;
  googleRatingCount?: number;
  googlePriceLevel?: number;
  googlePhotos?: string[];
  googleMapsUrl?: string;
}

const INPUT_FILE = path.join(__dirname, '..', 'src', 'stockholm-overpass.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'stockholm-venues-enriched.json');

const FIELD_MASK = 'places.id,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.photos,places.googleMapsUri,places.location';

const PRICE_LEVEL_MAP: Record<string, number> = {
  'PRICE_LEVEL_FREE': 0,
  'PRICE_LEVEL_INEXPENSIVE': 1,
  'PRICE_LEVEL_MODERATE': 2,
  'PRICE_LEVEL_EXPENSIVE': 3,
  'PRICE_LEVEL_VERY_EXPENSIVE': 4,
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Normalize a name for loose comparison (strip accents, lowercase, remove punctuation) */
function normalizeName(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ') // keep only letters/numbers
    .trim();
}

/** Compute a similarity score between two names (0..1) */
function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  if (nb.includes(na) || na.includes(nb)) return 0.9;

  // Token overlap
  const tokensA = new Set(na.split(' ').filter(t => t.length > 1));
  const tokensB = new Set(nb.split(' ').filter(t => t.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let shared = 0;
  for (const t of tokensA) if (tokensB.has(t)) shared++;
  return shared / Math.max(tokensA.size, tokensB.size);
}

function scoreMatch(
  venue: Venue,
  placeName: string,
  dist: number,
): number {
  const nameSim = nameSimilarity(venue.name, placeName);
  // Distance penalty: 0m=1.0, 150m=0.8, 300m=0.5, 500m=0.2
  const distScore = Math.max(0, 1 - dist / 500);
  // Combined: name similarity is most important, distance breaks ties
  return nameSim * 0.7 + distScore * 0.3;
}

async function searchPlaceOnce(
  venue: Venue,
  query: string,
  radius: number,
): Promise<{ place: any; dist: number; score: number } | null> {
  const body = {
    textQuery: query,
    locationBias: {
      circle: {
        center: { latitude: venue.lat, longitude: venue.lng },
        radius,
      },
    },
    maxResultCount: 5,
  };

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY!,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`\n  API error ${response.status}: ${errorText.slice(0, 200)}`);
    return null;
  }

  const data = await response.json();
  const places = data.places;
  if (!places || places.length === 0) return null;

  // Score all results, pick the best
  let best: { place: any; dist: number; score: number } | null = null;
  for (const place of places) {
    if (!place.location) continue;
    const dist = haversineDistance(
      venue.lat, venue.lng,
      place.location.latitude, place.location.longitude,
    );
    if (dist > 600) continue; // hard cap to prevent wildly wrong matches

    const placeName = place.displayName?.text || '';
    const score = scoreMatch(venue, placeName, dist);

    if (!best || score > best.score) {
      best = { place, dist, score };
    }
  }

  return best;
}

async function searchPlace(venue: Venue): Promise<Partial<Venue> | null> {
  // Strategy: try multiple queries + radii, pick the best score across all
  const attempts = [
    { query: `${venue.name}, Stockholm`, radius: 300 },
    { query: venue.name, radius: 400 },
    { query: `${venue.name} ${venue.neighborhood}`, radius: 500 },
  ];

  let best: { place: any; dist: number; score: number } | null = null;

  for (const attempt of attempts) {
    const result = await searchPlaceOnce(venue, attempt.query, attempt.radius);
    if (result && (!best || result.score > best.score)) {
      best = result;
    }
    // If we got a great match, stop early
    if (best && best.score >= 0.85) break;
    // Small delay between retries
    await sleep(80);
  }

  if (!best) return null;

  // Accept if: good name match AND reasonable distance (<400m),
  // OR exact name match within 600m
  const { place, dist, score } = best;
  const placeName = place.displayName?.text || '';
  const nameSim = nameSimilarity(venue.name, placeName);

  const accept = (score >= 0.6) || (nameSim >= 0.9 && dist < 600);
  if (!accept) return null;

  // Extract photo resource names (max 3)
  const photos: string[] = [];
  if (place.photos) {
    for (const photo of place.photos.slice(0, 3)) {
      if (photo.name) photos.push(photo.name);
    }
  }

  return {
    googlePlaceId: place.id,
    googleRating: place.rating,
    googleRatingCount: place.userRatingCount,
    googlePriceLevel: place.priceLevel ? PRICE_LEVEL_MAP[place.priceLevel] ?? undefined : undefined,
    googlePhotos: photos.length > 0 ? photos : undefined,
    googleMapsUrl: place.googleMapsUri,
  };
}

async function main() {
  console.log('=== Google Places Enrichment ===\n');

  // Load input venues
  const rawVenues: Venue[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`Loaded ${rawVenues.length} venues from ${path.basename(INPUT_FILE)}`);

  // Load existing enriched data (for resume support)
  let enriched: Venue[] = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    enriched = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    console.log(`Found existing enriched file with ${enriched.length} venues`);
  }

  // Build a map of already-enriched venue IDs
  const enrichedMap = new Map<string, Venue>();
  for (const v of enriched) {
    enrichedMap.set(v.id, v);
  }

  const results: Venue[] = [];
  let matched = 0;
  let skipped = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < rawVenues.length; i++) {
    const venue = rawVenues[i];

    // Resume: if already enriched (has googlePlaceId), skip
    const existing = enrichedMap.get(venue.id);
    if (existing?.googlePlaceId) {
      results.push(existing);
      skipped++;
      continue;
    }

    // Progress logging
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const remaining = rawVenues.length - i - skipped;
    const rate = (i - skipped + 1) / Math.max(1, Number(elapsed));
    const eta = remaining > 0 ? Math.round(remaining / Math.max(0.1, rate)) : 0;
    process.stdout.write(`\r[${i + 1}/${rawVenues.length}] ${venue.name.padEnd(40).slice(0, 40)} | ✓${matched} ✗${failed} ⏭${skipped} | ETA: ${eta}s  `);

    try {
      const googleData = await searchPlace(venue);

      if (googleData) {
        results.push({ ...venue, ...googleData });
        matched++;
      } else {
        results.push(venue); // Keep original data without Google fields
        failed++;
      }
    } catch (err) {
      console.error(`\n  Error for "${venue.name}": ${(err as Error).message}`);
      results.push(venue);
      failed++;
    }

    // Rate limit
    await sleep(120);
  }

  console.log(`\n\n=== Results ===`);
  console.log(`Total:   ${results.length}`);
  console.log(`Matched: ${matched} (Google data found)`);
  console.log(`Skipped: ${skipped} (already enriched)`);
  console.log(`Failed:  ${failed} (no match / error)`);

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\nSaved to ${OUTPUT_FILE}`);

  // Stats on enrichment quality
  const withRating = results.filter(v => v.googleRating != null).length;
  const withPhotos = results.filter(v => v.googlePhotos && v.googlePhotos.length > 0).length;
  const withPrice = results.filter(v => v.googlePriceLevel != null).length;
  console.log(`\nCoverage:`);
  console.log(`  Rating:     ${withRating}/${results.length} (${Math.round(100 * withRating / results.length)}%)`);
  console.log(`  Photos:     ${withPhotos}/${results.length} (${Math.round(100 * withPhotos / results.length)}%)`);
  console.log(`  PriceLevel: ${withPrice}/${results.length} (${Math.round(100 * withPrice / results.length)}%)`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
