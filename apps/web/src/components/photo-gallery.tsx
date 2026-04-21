'use client';

import { useState, useRef, useEffect } from 'react';

interface PhotoGalleryProps {
  photos: string[]; // Google photo resource names
  alt: string;
  className?: string;
  height?: number;
}

export default function PhotoGallery({ photos, alt, className = '', height = 240 }: PhotoGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState<Set<number>>(new Set());

  // Track scroll position to update dots
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const index = Math.round(el.scrollLeft / el.clientWidth);
      setActiveIndex(index);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToIndex = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
  };

  const validPhotos = photos.filter((_, i) => !failedPhotos.has(i));
  if (validPhotos.length === 0) return null;

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth h-full no-scrollbar"
        style={{ scrollbarWidth: 'none' }}
      >
        {photos.map((photoRef, i) => {
          if (failedPhotos.has(i)) return null;
          return (
            <div key={i} className="w-full h-full flex-shrink-0 snap-center bg-gray-100 relative">
              <img
                src={`/api/photo?ref=${encodeURIComponent(photoRef)}&maxWidth=800`}
                alt={`${alt} — bild ${i + 1}`}
                className="w-full h-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
                onError={() => setFailedPhotos(prev => new Set(prev).add(i))}
              />
            </div>
          );
        })}
      </div>

      {/* Google attribution */}
      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
        Google
      </div>

      {/* Dots indicator */}
      {validPhotos.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {photos.map((_, i) => {
            if (failedPhotos.has(i)) return null;
            return (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  activeIndex === i ? 'bg-white w-6' : 'bg-white/50 w-1.5'
                }`}
                aria-label={`Gå till bild ${i + 1}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
