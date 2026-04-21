'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SunBadge } from '@followthesun/ui';
import { getSunTimes, formatTime } from '@followthesun/sun-engine';
import { useAppStore } from '@/store';

function StarRating({ rating, count }: { rating: number; count?: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: fullStars }).map((_, i) => (
          <span key={`full-${i}`} className="text-amber-400 text-sm">★</span>
        ))}
        {hasHalf && <span className="text-amber-400 text-sm">★</span>}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300 text-sm">★</span>
        ))}
      </div>
      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{rating.toFixed(1)}</span>
      {count != null && (
        <span className="text-xs text-[var(--color-text-secondary)]">({count.toLocaleString('sv-SE')})</span>
      )}
    </div>
  );
}

function PriceLevel({ level }: { level: number }) {
  const labels = ['Gratis', 'Billigt', 'Medel', 'Dyrt', 'Lyxigt'];
  return (
    <span className="text-sm text-[var(--color-text-secondary)]">
      {'💰'.repeat(Math.max(1, level))}{' '}
      <span className="text-xs">{labels[level] ?? ''}</span>
    </span>
  );
}

export default function VenueSheet() {
  const { venues, selectedVenueId, setSelectedVenueId, selectedDate } = useAppStore();

  const venue = useMemo(
    () => venues.find((v) => v.id === selectedVenueId) ?? null,
    [venues, selectedVenueId]
  );

  const sunTimes = useMemo(() => getSunTimes(selectedDate), [selectedDate]);
  const [photoError, setPhotoError] = useState(false);

  const mapsUrl = venue?.googleMapsUrl
    ?? (venue ? `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}` : '');

  const photoUrl = venue?.googlePhotos?.[0]
    ? `/api/photo?ref=${encodeURIComponent(venue.googlePhotos[0])}&maxWidth=600`
    : null;

  return (
    <AnimatePresence>
      {venue && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30"
            onClick={() => { setSelectedVenueId(null); setPhotoError(false); }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="absolute bottom-0 left-0 right-0 z-40 mx-3 mb-3"
          >
            <div className="rounded-2xl bg-white shadow-2xl border border-[var(--color-border)] overflow-hidden max-h-[70vh] overflow-y-auto">
              {/* Venue photo */}
              {photoUrl && !photoError && (
                <div className="relative w-full h-40 bg-gray-100">
                  <img
                    src={photoUrl}
                    alt={venue.name}
                    className="w-full h-40 object-cover"
                    onError={() => setPhotoError(true)}
                    loading="eager"
                  />
                  {/* Google attribution */}
                  <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded">
                    Google
                  </div>
                </div>
              )}

              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>

              <div className="px-5 pb-5">
                {/* Name + Badge */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--color-text-primary)] truncate">
                      {venue.name}
                    </h2>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                      {venue.neighborhood} · {venue.type === 'bar' ? 'Bar' : venue.type === 'restaurant' ? 'Restaurang' : venue.type === 'cafe' ? 'Cafe' : 'Pub'}
                    </p>
                  </div>
                  <SunBadge inSun={venue.inSun} className="mt-1 shrink-0" />
                </div>

                {/* Google rating + price */}
                {(venue.googleRating != null || venue.googlePriceLevel != null) && (
                  <div className="flex items-center gap-3 mb-3">
                    {venue.googleRating != null && (
                      <StarRating rating={venue.googleRating} count={venue.googleRatingCount} />
                    )}
                    {venue.googlePriceLevel != null && venue.googlePriceLevel > 0 && (
                      <PriceLevel level={venue.googlePriceLevel} />
                    )}
                  </div>
                )}

                {/* Details */}
                <div className="space-y-2 text-sm">
                  {venue.address && (
                    <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                      <span>📍</span>
                      <span>{venue.address}</span>
                    </div>
                  )}
                  {venue.openingHours && (
                    <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                      <span>🕐</span>
                      <span className="truncate">{venue.openingHours}</span>
                    </div>
                  )}
                  {venue.cuisine && (
                    <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                      <span>🍽</span>
                      <span className="capitalize">{venue.cuisine.replace(/;/g, ', ')}</span>
                    </div>
                  )}
                  {venue.website && (
                    <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                      <span>🌐</span>
                      <a
                        href={venue.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-primary)] hover:underline truncate"
                      >
                        {venue.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                      </a>
                    </div>
                  )}
                  {venue.sunHoursNote && (
                    <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                      <span>☀️</span>
                      <span className="italic">{venue.sunHoursNote}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                    <span>🌅</span>
                    <span>
                      Soluppgång {formatTime(sunTimes.sunrise)} · Solnedgång {formatTime(sunTimes.sunset)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-light)] transition-colors"
                  >
                    Öppna i Google Maps
                  </a>
                  <button
                    onClick={() => {
                      const text = `${venue.inSun ? '☀️ Sol' : '🌥 Skugga'} just nu på ${venue.name}!`;
                      if (typeof navigator !== 'undefined' && navigator.share) {
                        navigator.share({
                          title: `${venue.name} — FollowTheSun`,
                          text,
                          url: window.location.href,
                        });
                      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(`${text} ${window.location.href}`);
                      }
                    }}
                    className="py-2.5 px-4 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition-colors"
                  >
                    Dela
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
