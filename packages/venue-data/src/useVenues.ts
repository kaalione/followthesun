import { useState, useEffect } from 'react';
import { fetchStockholmVenues } from './overpassFetcher';
import type { Venue } from './types';

// Try enriched data first (with Google Places), fall back to basic Overpass data
let staticVenues: Venue[];
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  staticVenues = require('./stockholm-venues-enriched.json') as Venue[];
} catch {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  staticVenues = require('./stockholm-overpass.json') as Venue[];
}

const CACHE_KEY = 'followthesun_venues_v4';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface VenueCache {
  venues: Venue[];
  fetchedAt: number;
}

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>(staticVenues);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'static' | 'cache' | 'api'>('static');

  useEffect(() => {
    let cancelled = false;

    async function refreshVenues() {
      // 1. Check localStorage for a fresher copy
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: VenueCache = JSON.parse(cached);
          if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS && parsed.venues.length > 100) {
            if (!cancelled) {
              setVenues(parsed.venues);
              setSource('cache');
            }
            return;
          }
        }
      } catch {
        // Ignore cache errors
      }

      // 2. Background Overpass refresh (best-effort, won't override Google data)
      try {
        const freshVenues = await fetchStockholmVenues();
        if (cancelled) return;

        if (freshVenues.length > 100) {
          // Merge: keep Google enrichment from static data, update OSM fields
          const enrichedMap = new Map<string, Venue>();
          for (const v of staticVenues) {
            enrichedMap.set(v.id, v);
          }

          const merged = freshVenues.map((fresh: Venue) => {
            const existing = enrichedMap.get(fresh.id);
            if (existing?.googlePlaceId) {
              // Keep Google fields from existing, update OSM fields
              return {
                ...fresh,
                googlePlaceId: existing.googlePlaceId,
                googleRating: existing.googleRating,
                googleRatingCount: existing.googleRatingCount,
                googlePriceLevel: existing.googlePriceLevel,
                googlePhotos: existing.googlePhotos,
                googleMapsUrl: existing.googleMapsUrl,
              };
            }
            return fresh;
          });

          setVenues(merged);
          setSource('api');
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ venues: merged, fetchedAt: Date.now() } satisfies VenueCache)
          );
        }
      } catch (err) {
        if (cancelled) return;
        console.info('[FollowTheSun] Overpass refresh skipped:', (err as Error).message);
      }
    }

    refreshVenues();
    return () => { cancelled = true; };
  }, []);

  return { venues, isLoading, error, source };
}
