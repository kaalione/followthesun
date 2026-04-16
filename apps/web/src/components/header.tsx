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
      <div className="flex items-center justify-between px-4 pt-4">
        {/* Logo */}
        <div className="pointer-events-auto bg-white/90 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-md border border-[var(--color-border)]">
          <h1 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <span className="text-xl">☀️</span>
            <span>FollowTheSun</span>
          </h1>
        </div>

        {/* Actions */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Locate me */}
          <button
            onClick={requestLocateMe}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium shadow-md border bg-white/90 backdrop-blur-md text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-white transition-all"
            title="Hitta mig"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            <span className="hidden sm:inline">Nära mig</span>
          </button>

          {/* Shadow overlay toggle */}
          <button
            onClick={() => setShowShadows(!showShadows)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium shadow-md border transition-all ${
              showShadows
                ? 'bg-[var(--color-shade)] text-white border-[var(--color-shade)]'
                : 'bg-white/90 backdrop-blur-md text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-white'
            }`}
            title="Visa/dölj skuggor"
          >
            <span>{showShadows ? '🌗' : '🌕'}</span>
            <span className="hidden sm:inline">Skuggor</span>
          </button>

          {/* Sun filter */}
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
