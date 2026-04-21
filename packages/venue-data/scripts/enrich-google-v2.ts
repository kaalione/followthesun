/**
 * Google Places Enrichment V2
 *
 * Takes venues that already have googlePlaceId (from pass 1) and fetches
 * additional details via the Place Details endpoint:
 * - Reviews (top 5)
 * - Editorial summary
 * - Phone, website
 * - Amenity booleans: allowsDogs, outdoorSeating, wheelchair access
 * - Serves: breakfast, lunch, dinner, beer, wine, vegetarian
 *
 * Usage:
 *   GOOGLE_PLACES_API_KEY=your_key npx tsx packages/venue-data/scripts/enrich-google-v2.ts
 *
 * Reads from and writes back to: packages/venue-data/src/stockholm-venues-enriched.json
 * Resume-safe: skips venues that already have googleReviews or googleEditorialSummary.
 */

import * as fs from 'fs';
import * as path from 'path';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error('ERROR: Set GOOGLE_PLACES_API_KEY environment variable');
  process.exit(1);
}

const ENRICHED_FILE = path.join(__dirname, '..', 'src', 'stockholm-venues-enriched.json');

// Request only the fields we need (costs scale with highest tier in mask)
const FIELD_MASK = [
  'reviews',
  'editorialSummary',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
  'allowsDogs',
  'outdoorSeating',
  'accessibilityOptions',
  'servesBreakfast',
  'servesLunch',
  'servesDinner',
  'servesBeer',
  'servesWine',
  'servesVegetarianFood',
  'goodForGroups',
  'liveMusic',
].join(',');

interface Venue {
  id: string;
  name: string;
  googlePlaceId?: string;
  googleReviews?: unknown[];
  googleEditorialSummary?: string;
  [key: string]: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPlaceDetails(placeId: string): Promise<any | null> {
  const url = `https://places.googleapis.com/v1/places/${placeId}`;

  const response = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': API_KEY!,
      'X-Goog-FieldMask': FIELD_MASK,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`\n  Error ${response.status}: ${errorText.slice(0, 200)}`);
    return null;
  }

  return response.json();
}

function parseReviews(reviews: any[] | undefined): any[] | undefined {
  if (!reviews || reviews.length === 0) return undefined;

  return reviews.slice(0, 5).map((r: any) => ({
    authorName: r.authorAttribution?.displayName ?? 'Anonymous',
    rating: r.rating ?? 0,
    text: r.text?.text ?? r.originalText?.text,
    relativeTime: r.relativePublishTimeDescription,
    photoUrl: r.authorAttribution?.photoUri,
    publishTime: r.publishTime,
  })).filter((r: any) => r.text || r.rating); // must have content
}

async function main() {
  console.log('=== Google Places Enrichment V2 (Rich Details) ===\n');

  const venues: Venue[] = JSON.parse(fs.readFileSync(ENRICHED_FILE, 'utf-8'));
  console.log(`Loaded ${venues.length} venues`);

  const withPlaceId = venues.filter(v => v.googlePlaceId);
  console.log(`Venues with Google Place ID: ${withPlaceId.length}`);

  let enhanced = 0;
  let skipped = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];

    // Skip if no place ID
    if (!venue.googlePlaceId) continue;

    // Skip if already enriched (has reviews or editorial summary)
    if (venue.googleReviews || venue.googleEditorialSummary !== undefined) {
      skipped++;
      continue;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const done = enhanced + failed;
    const remaining = withPlaceId.length - skipped - done;
    const rate = done / Math.max(1, Number(elapsed));
    const eta = remaining > 0 && rate > 0 ? Math.round(remaining / rate) : 0;
    process.stdout.write(`\r[${i + 1}/${venues.length}] ${venue.name.padEnd(40).slice(0, 40)} | ✓${enhanced} ✗${failed} ⏭${skipped} | ETA: ${eta}s  `);

    try {
      const details = await fetchPlaceDetails(venue.googlePlaceId);

      if (details) {
        // Merge all new fields into the venue
        const reviews = parseReviews(details.reviews);
        if (reviews && reviews.length > 0) venue.googleReviews = reviews as any;
        if (details.editorialSummary?.text) venue.googleEditorialSummary = details.editorialSummary.text;
        if (details.nationalPhoneNumber) venue.googlePhone = details.nationalPhoneNumber;
        if (details.websiteUri) venue.googleWebsite = details.websiteUri;
        if (typeof details.allowsDogs === 'boolean') venue.googleAllowsDogs = details.allowsDogs;
        if (typeof details.outdoorSeating === 'boolean') venue.googleOutdoorSeating = details.outdoorSeating;

        const acc = details.accessibilityOptions;
        if (acc && (acc.wheelchairAccessibleEntrance || acc.wheelchairAccessibleRestroom || acc.wheelchairAccessibleSeating)) {
          venue.googleAccessibilityWheelchair = true;
        } else if (acc) {
          venue.googleAccessibilityWheelchair = false;
        }

        if (typeof details.servesBreakfast === 'boolean') venue.googleServesBreakfast = details.servesBreakfast;
        if (typeof details.servesLunch === 'boolean') venue.googleServesLunch = details.servesLunch;
        if (typeof details.servesDinner === 'boolean') venue.googleServesDinner = details.servesDinner;
        if (typeof details.servesBeer === 'boolean') venue.googleServesBeer = details.servesBeer;
        if (typeof details.servesWine === 'boolean') venue.googleServesWine = details.servesWine;
        if (typeof details.servesVegetarianFood === 'boolean') venue.googleServesVegetarian = details.servesVegetarianFood;
        if (typeof details.goodForGroups === 'boolean') venue.googleGoodForGroups = details.goodForGroups;
        if (typeof details.liveMusic === 'boolean') venue.googleLiveMusic = details.liveMusic;

        enhanced++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`\n  Error for "${venue.name}":`, (err as Error).message);
      failed++;
    }

    // Save every 50 venues so we can resume if interrupted
    if ((enhanced + failed) % 50 === 0 && (enhanced + failed) > 0) {
      fs.writeFileSync(ENRICHED_FILE, JSON.stringify(venues, null, 2));
    }

    await sleep(120);
  }

  // Final write
  fs.writeFileSync(ENRICHED_FILE, JSON.stringify(venues, null, 2));

  console.log(`\n\n=== Results ===`);
  console.log(`Enhanced: ${enhanced}`);
  console.log(`Skipped:  ${skipped} (already enriched)`);
  console.log(`Failed:   ${failed}`);

  // Coverage stats
  const withReviews = venues.filter(v => Array.isArray(v.googleReviews) && v.googleReviews.length > 0).length;
  const withSummary = venues.filter(v => v.googleEditorialSummary).length;
  const withPhone = venues.filter(v => v.googlePhone).length;
  const withOutdoor = venues.filter(v => v.googleOutdoorSeating === true).length;
  const withDogs = venues.filter(v => v.googleAllowsDogs === true).length;
  const withWheelchair = venues.filter(v => v.googleAccessibilityWheelchair === true).length;

  console.log(`\nCoverage (of ${venues.length} total):`);
  console.log(`  Reviews:      ${withReviews} (${Math.round(100 * withReviews / venues.length)}%)`);
  console.log(`  Description:  ${withSummary} (${Math.round(100 * withSummary / venues.length)}%)`);
  console.log(`  Phone:        ${withPhone} (${Math.round(100 * withPhone / venues.length)}%)`);
  console.log(`  Outdoor:      ${withOutdoor}`);
  console.log(`  Dogs welcome: ${withDogs}`);
  console.log(`  Wheelchair:   ${withWheelchair}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
