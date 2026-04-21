'use client';

import { useState } from 'react';
import type { GoogleReview } from '@followthesun/venue-data';

interface ReviewCardProps {
  review: GoogleReview;
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('');
}

function MiniStars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  return (
    <div className="flex items-center">
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f-${i}`} className="text-amber-400 text-xs">★</span>
      ))}
      {hasHalf && <span className="text-amber-400 text-xs">★</span>}
      {Array.from({ length: 5 - full - (hasHalf ? 1 : 0) }).map((_, i) => (
        <span key={`e-${i}`} className="text-gray-300 text-xs">★</span>
      ))}
    </div>
  );
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const text = review.text ?? '';
  const isLong = text.length > 200;
  const displayText = expanded || !isLong ? text : text.slice(0, 200) + '…';

  // Translate Google's English relative time to Swedish
  const timeText = translateRelativeTime(review.relativeTime ?? '');

  return (
    <div className="border-b border-[var(--color-border)] py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {review.photoUrl ? (
          <img
            src={review.photoUrl}
            alt={review.authorName}
            className="w-8 h-8 rounded-full shrink-0 bg-gray-100"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] text-white text-xs font-semibold flex items-center justify-center shrink-0">
            {initials(review.authorName)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {review.authorName}
            </span>
            {timeText && (
              <span className="text-xs text-[var(--color-text-secondary)] shrink-0">
                {timeText}
              </span>
            )}
          </div>

          <div className="mt-0.5">
            <MiniStars rating={review.rating} />
          </div>

          {text && (
            <p className="mt-1.5 text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line">
              {displayText}
              {isLong && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="ml-1 text-[var(--color-primary)] font-medium hover:underline"
                >
                  {expanded ? 'Visa mindre' : 'Läs mer'}
                </button>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function translateRelativeTime(en: string): string {
  if (!en) return '';
  const map: Array<[RegExp, string]> = [
    [/a day ago/i, '1 dag sedan'],
    [/(\d+) days ago/i, '$1 dagar sedan'],
    [/a week ago/i, '1 vecka sedan'],
    [/(\d+) weeks ago/i, '$1 veckor sedan'],
    [/a month ago/i, '1 månad sedan'],
    [/(\d+) months ago/i, '$1 månader sedan'],
    [/a year ago/i, '1 år sedan'],
    [/(\d+) years ago/i, '$1 år sedan'],
    [/(\d+) hours ago/i, '$1 timmar sedan'],
    [/an hour ago/i, '1 timme sedan'],
  ];
  for (const [re, sv] of map) {
    if (re.test(en)) return en.replace(re, sv);
  }
  return en;
}
