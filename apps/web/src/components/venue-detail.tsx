'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SunBadge } from '@followthesun/ui';
import { getSunTimes, formatTime } from '@followthesun/sun-engine';
import { useAppStore } from '@/store';
import { useIsMobile } from '@/hooks/use-is-mobile';
import PhotoGallery from './photo-gallery';
import StreetViewEmbed from './street-view-embed';
import ReviewCard from './review-card';

function StarRating({ rating, count }: { rating: number; count?: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: fullStars }).map((_, i) => (
          <span key={`full-${i}`} className="text-amber-400">★</span>
        ))}
        {hasHalf && <span className="text-amber-400">★</span>}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300">★</span>
        ))}
      </div>
      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
        {rating.toFixed(1)}
      </span>
      {count != null && (
        <span className="text-xs text-[var(--color-text-secondary)]">
          ({count.toLocaleString('sv-SE')} recensioner)
        </span>
      )}
    </div>
  );
}

function AmenityBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)]">
      <span>{icon}</span> {label}
    </span>
  );
}

function InfoRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]">
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function typeLabel(t: string): string {
  switch (t) {
    case 'bar': return 'Bar';
    case 'restaurant': return 'Restaurang';
    case 'cafe': return 'Café';
    case 'pub': return 'Pub';
    default: return t;
  }
}

export default function VenueDetail() {
  const { venues, selectedVenueId, setSelectedVenueId, selectedDate } = useAppStore();
  const isMobile = useIsMobile();

  const venue = useMemo(
    () => venues.find((v) => v.id === selectedVenueId) ?? null,
    [venues, selectedVenueId]
  );

  const sunTimes = useMemo(() => getSunTimes(selectedDate), [selectedDate]);
  const close = () => setSelectedVenueId(null);

  if (!venue) {
    return (
      <AnimatePresence>{null}</AnimatePresence>
    );
  }

  const mapsUrl = venue.googleMapsUrl
    ?? `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}&query_place_id=${venue.googlePlaceId ?? ''}`;

  const websiteUrl = venue.googleWebsite ?? venue.website;
  const phone = venue.googlePhone ?? venue.phone;
  const photos = venue.googlePhotos ?? [];
  const reviews = venue.googleReviews ?? [];

  // Amenities
  const amenities: Array<{ icon: string; label: string }> = [];
  if (venue.googleOutdoorSeating) amenities.push({ icon: '🌳', label: 'Uteservering' });
  if (venue.googleAllowsDogs) amenities.push({ icon: '🐕', label: 'Hundar välkomna' });
  if (venue.googleAccessibilityWheelchair) amenities.push({ icon: '♿', label: 'Tillgänglig' });
  if (venue.googleServesBreakfast) amenities.push({ icon: '🥐', label: 'Frukost' });
  if (venue.googleServesLunch) amenities.push({ icon: '🍽', label: 'Lunch' });
  if (venue.googleServesDinner) amenities.push({ icon: '🍷', label: 'Middag' });
  if (venue.googleServesBeer) amenities.push({ icon: '🍺', label: 'Öl' });
  if (venue.googleServesWine) amenities.push({ icon: '🍾', label: 'Vin' });
  if (venue.googleServesVegetarian) amenities.push({ icon: '🌱', label: 'Vegetariskt' });
  if (venue.googleLiveMusic) amenities.push({ icon: '🎵', label: 'Live-musik' });
  if (venue.googleGoodForGroups) amenities.push({ icon: '👥', label: 'Bra för grupper' });

  // Animation variants: mobile slides up, desktop slides from right
  const variants = isMobile
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } };

  const content = (
    <div className="flex flex-col h-full bg-white">
      {/* Hero photo gallery */}
      {photos.length > 0 && (
        <div className="relative">
          <PhotoGallery photos={photos} alt={venue.name} height={isMobile ? 280 : 240} />
          {/* Close button over photo */}
          <button
            onClick={close}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center hover:bg-black/80 transition"
            aria-label="Stäng"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Close button (when no photos) */}
        {photos.length === 0 && (
          <div className="flex justify-end p-3">
            <button
              onClick={close}
              className="w-9 h-9 rounded-full bg-gray-100 text-[var(--color-text-secondary)] flex items-center justify-center hover:bg-gray-200 transition"
              aria-label="Stäng"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <div className="px-5 pt-4 pb-6 space-y-5">
          {/* Header: name + sun badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
                {venue.name}
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {typeLabel(venue.type)} · {venue.neighborhood}
              </p>
            </div>
            <SunBadge inSun={venue.inSun} className="shrink-0 mt-1" />
          </div>

          {/* Rating + price row */}
          {(venue.googleRating != null || venue.googlePriceLevel != null) && (
            <div className="flex items-center gap-4 flex-wrap">
              {venue.googleRating != null && (
                <StarRating rating={venue.googleRating} count={venue.googleRatingCount} />
              )}
              {venue.googlePriceLevel != null && venue.googlePriceLevel > 0 && (
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {'💰'.repeat(venue.googlePriceLevel)}
                </span>
              )}
            </div>
          )}

          {/* Editorial summary */}
          {venue.googleEditorialSummary && (
            <p className="text-sm text-[var(--color-text-primary)] italic leading-relaxed">
              {venue.googleEditorialSummary}
            </p>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {amenities.map((a) => (
                <AmenityBadge key={a.label} icon={a.icon} label={a.label} />
              ))}
            </div>
          )}

          {/* Street View */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] mb-2">
              Street View
            </h3>
            <StreetViewEmbed lat={venue.lat} lng={venue.lng} name={venue.name} />
          </div>

          {/* Contact info */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
              Information
            </h3>

            {venue.address && (
              <InfoRow icon="📍">{venue.address}</InfoRow>
            )}

            {venue.openingHours && (
              <InfoRow icon="🕐">
                <span className="whitespace-pre-line">{venue.openingHours}</span>
              </InfoRow>
            )}

            {phone && (
              <InfoRow icon="📞">
                <a href={`tel:${phone}`} className="text-[var(--color-primary)] hover:underline">
                  {phone}
                </a>
              </InfoRow>
            )}

            {websiteUrl && (
              <InfoRow icon="🌐">
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] hover:underline truncate inline-block max-w-full"
                >
                  {websiteUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </a>
              </InfoRow>
            )}

            {venue.cuisine && (
              <InfoRow icon="🍽">
                <span className="capitalize">{venue.cuisine.replace(/;/g, ', ')}</span>
              </InfoRow>
            )}

            {venue.sunHoursNote && (
              <InfoRow icon="☀️">
                <span className="italic">{venue.sunHoursNote}</span>
              </InfoRow>
            )}

            <InfoRow icon="🌅">
              Soluppgång {formatTime(sunTimes.sunrise)} · Solnedgång {formatTime(sunTimes.sunset)}
            </InfoRow>
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] mb-2">
                Recensioner från Google
              </h3>
              <div>
                {reviews.slice(0, 5).map((r, i) => (
                  <ReviewCard key={i} review={r} />
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-light)] transition-colors"
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
              className="py-3 px-5 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition-colors"
            >
              Dela
            </button>
          </div>

          {/* Coming soon note */}
          <div className="pt-2">
            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-3 text-center text-xs text-[var(--color-text-secondary)]">
              💬 Snart: checka in här och se dina vänner
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {venue && (
        <>
          {/* Backdrop — only on mobile */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/40"
              onClick={close}
            />
          )}

          {/* Detail panel */}
          <motion.div
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className={
              isMobile
                ? 'absolute inset-x-0 bottom-0 top-8 z-40 rounded-t-3xl overflow-hidden shadow-2xl'
                : 'absolute right-0 top-0 bottom-0 z-40 w-[420px] max-w-[90vw] shadow-2xl border-l border-[var(--color-border)]'
            }
          >
            {content}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
