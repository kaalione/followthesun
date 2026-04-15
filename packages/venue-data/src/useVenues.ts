import { useState, useEffect } from 'react';
import { fetchStockholmVenues } from './overpassFetcher';
import type { Venue } from './types';
import { stockholmVenues } from './venues';

const CACHE_KEY = 'followthesun_venues_v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface VenueCache {
  venues: Venue[];
  fetchedAt: number;
}

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>(stockholmVenues);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'cache' | 'api' | 'fallback'>('fallback');

  useEffect(() => {
    let cancelled = false;

    async function loadVenues() {
      // 1. Check localStorage cache
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: VenueCache = JSON.parse(cached);
          if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS && parsed.venues.length > 10) {
            if (!cancelled) {
              setVenues(parsed.venues);
              setSource('cache');
              setIsLoading(false);
            }
            return;
          }
        }
      } catch {
        // Ignore cache errors
      }

      // 2. Fetch from Overpass API
      try {
        const freshVenues = await fetchStockholmVenues();
        if (cancelled) return;

        if (freshVenues.length > 10) {
          setVenues(freshVenues);
          setSource('api');
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ venues: freshVenues, fetchedAt: Date.now() } satisfies VenueCache)
          );
        } else {
          throw new Error('Too few venues returned');
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('Overpass API failed, using fallback:', err);
        setError('Kunde inte hämta färsk venue-data. Visar sparad data.');
        setSource('fallback');
        // Keep fallback venues
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadVenues();
    return () => { cancelled = true; };
  }, []);

  return { venues, isLoading, error, source };
}
