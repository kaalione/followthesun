'use client';

import { useState } from 'react';

interface StreetViewEmbedProps {
  lat: number;
  lng: number;
  name: string;
  heading?: number; // 0-360, 0=north
  pitch?: number;   // -90 to 90
  fov?: number;     // 10-100
}

/**
 * Google Maps Embed API — Street View
 * Free, unlimited usage. Requires "Maps Embed API" to be enabled on the Google Cloud project.
 * Uses the same API key as Places API (domain-restricted server side).
 */
export default function StreetViewEmbed({
  lat, lng, name,
  heading = 0,
  pitch = 0,
  fov = 90,
}: StreetViewEmbedProps) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  const [loaded, setLoaded] = useState(false);

  if (!key) {
    // Fallback: link out to Street View
    return (
      <a
        href={`https://www.google.com/maps/@${lat},${lng},3a,75y,${heading}h,90t/data=!3m6!1e1`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full h-48 rounded-xl bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center text-sm text-sky-900 hover:shadow-md transition"
      >
        🗺 Öppna Street View i Google Maps →
      </a>
    );
  }

  const src = `https://www.google.com/maps/embed/v1/streetview?key=${key}&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=${fov}`;

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-100">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--color-text-secondary)] bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--color-sun)] animate-pulse" />
            Laddar Street View...
          </div>
        </div>
      )}
      <iframe
        title={`Street View — ${name}`}
        src={src}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full h-full border-0"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
