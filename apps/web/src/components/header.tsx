'use client';

import { useAppStore } from '@/store';

export default function Header() {
  const {
    showOnlySunny, setShowOnlySunny,
    showShadows, setShowShadows,
    isShadowEngineReady, requestLocateMe,
  } = useAppStore();

  return (
    <header className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
      <div className="flex items-start justify-between px-3 pt-3 gap-2">
        {/* Logo */}
        <div className="pointer-events-auto bg-white/90 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-md border border-[var(--color-border)] shrink-0">
          <h1 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <span className="text-xl">☀️</span>
            <span className="hidden sm:inline">FollowTheSun</span>
            <span className="sm:hidden">FTS</span>
          </h1>
        </div>

        {/* Actions — wrap on small screens, leave room for MapLibre nav */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 justify-end mr-10">
          {/* Locate me */}
          <button
            onClick={requestLocateMe}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-medium shadow-md border bg-white/90 backdrop-blur-md text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-white transition-all"
            title="Hitta mig"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            <span className="hidden md:inline">Nära mig</span>
          </button>

          {/* Shadow overlay toggle */}
          <button
            onClick={() => setShowShadows(!showShadows)}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-medium shadow-md border transition-all ${
              showShadows
                ? 'bg-[var(--color-shade)] text-white border-[var(--color-shade)]'
                : 'bg-white/90 backdrop-blur-md text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-white'
            }`}
            title="Visa/dölj skuggor och solriktning"
          >
            <span>{showShadows ? '🌗' : '🌕'}</span>
            <span className="hidden md:inline">Skuggor</span>
          </button>

          {/* Sun filter */}
          <button
            onClick={() => setShowOnlySunny(!showOnlySunny)}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-medium shadow-md border transition-all ${
              showOnlySunny
                ? 'bg-[var(--color-sun)] text-white border-[var(--color-sun)]'
                : 'bg-white/90 backdrop-blur-md text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-white'
            }`}
          >
            <span>☀️</span>
            <span className="hidden md:inline">Bara sol</span>
          </button>

          {!isShadowEngineReady && (
            <div className="bg-white/90 backdrop-blur-md rounded-xl px-2.5 py-2 shadow-md border border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <div className="w-3 h-3 rounded-full bg-[var(--color-sun)] animate-pulse" />
                <span className="hidden sm:inline">Beräknar sol...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
