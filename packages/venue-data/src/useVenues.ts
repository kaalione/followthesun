import { useState, useEffect } from 'react';
import { fetchStockholmVenues } from './overpassFetcher';
import type { Venue } from './types';

// Static snapshot: 723 venues pre-fetched from Overpass (always available, no API call needed)
import staticVenues from './stockholm-overpass.json';

const CACHE_KEY = 'followthesun_venues_v3';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface VenueCache {
  venues: Venue[];
  fetchedAt: number;
}

export function useVenues() {
  // Start with the static snapshot immediately — no loading state, no API call
  const [venues, setVenues] = useState<Venue[]>(staticVenues as Venue[]);
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
            return; // Cache is fresh enough
          }
        }
      } catch {
        // Ignore cache errors
      }

      // 2. Try refreshing from Overpass in the background (best-effort)
      try {
        const freshVenues = await fetchStockholmVenues();
        if (cancelled) return;

        if (freshVenues.length > 100) {
          setVenues(freshVenues);
          setSource('api');
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ venues: freshVenues, fetchedAt: Date.now() } satisfies VenueCache)
          );
        }
        // If <100 venues came back, silently keep static data
      } catch (err) {
        if (cancelled) return;
        // Overpass failed — totally fine, we already have 723 static venues
        console.info('[FollowTheSun] Overpass refresh skipped (static data is current):', (err as Error).message);
      }
    }

    refreshVenues();
    return () => { cancelled = true; };
  }, []);

  return { venues, isLoading, error, source };
}
