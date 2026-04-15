'use client';

import { useMemo } from 'react';
import { isNight, getSunTimes, formatTime, minutesToSunrise } from '@followthesun/sun-engine';
import { useAppStore } from '@/store';

export default function NightOverlay() {
  const { selectedDate } = useAppStore();

  const nightTime = useMemo(() => isNight(selectedDate), [selectedDate]);
  const sunTimes = useMemo(() => getSunTimes(selectedDate), [selectedDate]);
  const minsToSunrise = useMemo(() => minutesToSunrise(selectedDate), [selectedDate]);

  if (!nightTime) return null;

  const hours = minsToSunrise ? Math.floor(minsToSunrise / 60) : 0;
  const mins = minsToSunrise ? minsToSunrise % 60 : 0;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div className="bg-[var(--color-shade)]/90 backdrop-blur-md rounded-2xl px-6 py-4 shadow-xl text-center">
        <p className="text-white/90 text-lg font-semibold mb-1">🌙 Det är natt</p>
        <p className="text-white/60 text-sm">
          Soluppgång {formatTime(sunTimes.sunrise)}
          {minsToSunrise !== null && minsToSunrise > 0 && (
            <span> · om {hours > 0 ? `${hours}h ` : ''}{mins}min</span>
          )}
        </p>
      </div>
    </div>
  );
}
