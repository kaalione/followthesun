'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SunBadge } from '@followthesun/ui';
import { getSunTimes, formatTime } from '@followthesun/sun-engine';
import { useAppStore } from '@/store';

export default function VenueSheet() {
  const { venues, selectedVenueId, setSelectedVenueId, selectedDate } = useAppStore();

  const venue = useMemo(
    () => venues.find((v) => v.id === selectedVenueId) ?? null,
    [venues, selectedVenueId]
  );

  const sunTimes = useMemo(() => getSunTimes(selectedDate), [selectedDate]);

  const googleMapsUrl = venue
    ? `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`
    : '';

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
            onClick={() => setSelectedVenueId(null)}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="absolute bottom-0 left-0 right-0 z-40 mx-3 mb-3"
          >
            <div className="rounded-2xl bg-white shadow-2xl border border-[var(--color-border)] overflow-hidden">
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>

              <div className="px-5 pb-5">
                {/* Name + Badge */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--color-text-primary)]">
                      {venue.name}
                    </h2>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                      {venue.neighborhood} · {venue.type === 'bar' ? 'Bar' : venue.type === 'restaurant' ? 'Restaurang' : venue.type === 'cafe' ? 'Café' : 'Pub'}
                    </p>
                  </div>
                  <SunBadge inSun={venue.inSun} className="mt-1" />
                </div>

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
                      <span>{venue.openingHours}</span>
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
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-light)] transition-colors"
                  >
                    Öppna i Google Maps
                  </a>
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `${venue.name} — FollowTheSun`,
                          text: `${venue.inSun ? '☀️ Sol' : '🌥 Skugga'} just nu på ${venue.name}!`,
                          url: window.location.href,
                        });
                      } else {
                        navigator.clipboard.writeText(
                          `${venue.inSun ? '☀️ Sol' : '🌥 Skugga'} just nu på ${venue.name}! ${window.location.href}`
                        );
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
