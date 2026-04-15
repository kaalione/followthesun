'use client';

import { useAppStore } from '@/store';

export default function Header() {
  const { showOnlySunny, setShowOnlySunny, isShadowEngineReady } = useAppStore();

  return (
    <header className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
      <div className="flex items-center justify-between px-4 pt-4">
        {/* Logo */}
        <div className="pointer-events-auto bg-white/90 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-md border border-[var(--color-border)]">
          <h1 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <span className="text-xl">☀️</span>
            <span>FollowTheSun</span>
          </h1>
        </div>

        {/* Filter */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => setShowOnlySunny(!showOnlySunny)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium shadow-md border transition-all ${
              showOnlySunny
                ? 'bg-[var(--color-sun)] text-white border-[var(--color-sun)]'
                : 'bg-white/90 backdrop-blur-md text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-white'
            }`}
          >
            <span>☀️</span>
            <span>Bara sol</span>
          </button>

          {!isShadowEngineReady && (
            <div className="bg-white/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-md border border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <div className="w-3 h-3 rounded-full bg-[var(--color-sun)] animate-pulse" />
                Beräknar sol...
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
