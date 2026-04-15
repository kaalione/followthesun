'use client';

import { useMemo, useCallback, useState } from 'react';
import { getSunTimes, formatTime, minutesFromMidnight, dateFromMinutes } from '@followthesun/sun-engine';
import { useAppStore } from '@/store';

export default function TimeSlider() {
  const { selectedDate, isLiveMode, setSelectedDate, setLiveMode } = useAppStore();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const sunTimes = useMemo(() => getSunTimes(selectedDate), [selectedDate]);
  const currentMinutes = minutesFromMidnight(selectedDate);

  const sunriseMin = minutesFromMidnight(sunTimes.sunrise);
  const sunsetMin = minutesFromMidnight(sunTimes.sunset);

  // Slider range: 1 hour before sunrise to 1 hour after sunset
  const sliderMin = Math.max(0, sunriseMin - 60);
  const sliderMax = Math.min(1439, sunsetMin + 60);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const minutes = parseInt(e.target.value, 10);
      const newDate = dateFromMinutes(minutes, selectedDate);
      setSelectedDate(newDate);
    },
    [selectedDate, setSelectedDate]
  );

  const handleNowClick = useCallback(() => {
    setLiveMode(true);
    setSelectedDate(new Date());
  }, [setLiveMode, setSelectedDate]);

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const [year, month, day] = e.target.value.split('-').map(Number);
      const newDate = new Date(selectedDate);
      newDate.setFullYear(year, month - 1, day);
      setSelectedDate(newDate);
      setDatePickerOpen(false);
    },
    [selectedDate, setSelectedDate]
  );

  const dateStr = selectedDate.toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const timeStr = formatTime(selectedDate);
  const isoDate = selectedDate.toISOString().split('T')[0];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
      <div className="mx-3 mb-3 pointer-events-auto">
        <div className="rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-[var(--color-border)] px-5 py-4">
          {/* Top row: date + time + now button */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDatePickerOpen(!datePickerOpen)}
                className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors capitalize"
              >
                {dateStr}
              </button>
              {datePickerOpen && (
                <input
                  type="date"
                  value={isoDate}
                  onChange={handleDateChange}
                  className="text-sm border rounded-lg px-2 py-1 border-[var(--color-border)]"
                />
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-semibold text-[var(--color-text-primary)]">
                {timeStr}
              </span>
              <button
                onClick={handleNowClick}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  isLiveMode
                    ? 'bg-[var(--color-sun)] text-white shadow-sm'
                    : 'bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200'
                }`}
              >
                Nu
              </button>
            </div>
          </div>

          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              value={Math.max(sliderMin, Math.min(sliderMax, currentMinutes))}
              onChange={handleSliderChange}
              className="time-slider w-full"
            />
          </div>

          {/* Sunrise / Sunset labels */}
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-[var(--color-text-secondary)] font-mono">
              ☀️ {formatTime(sunTimes.sunrise)}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)] font-mono">
              🌙 {formatTime(sunTimes.sunset)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
