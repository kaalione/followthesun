'use client';

import dynamic from 'next/dynamic';

const SunMap = dynamic(() => import('@/components/sun-map'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg)]">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--color-sun)] animate-pulse mx-auto mb-4" />
        <p className="text-[var(--color-text-secondary)] text-sm">Laddar kartan...</p>
      </div>
    </div>
  ),
});

const Header = dynamic(() => import('@/components/header'), { ssr: false });
const TimeSlider = dynamic(() => import('@/components/time-slider'), { ssr: false });
const VenueSheet = dynamic(() => import('@/components/venue-sheet'), { ssr: false });
const NightOverlay = dynamic(() => import('@/components/night-overlay'), { ssr: false });

export default function HomePage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <SunMap />
      <Header />
      <NightOverlay />
      <TimeSlider />
      <VenueSheet />
    </main>
  );
}
