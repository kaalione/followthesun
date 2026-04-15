import SunCalc from 'suncalc';

export const STOCKHOLM = { lat: 59.3293, lng: 18.0686 };

// Re-export shadow engine
export {
  getSunPositionForShadow,
  isPointInShadow,
  checkVenuesSunStatus,
  extractBuildingsFromFeatures,
} from './shadowEngine';
export type { SunPosition, Building } from './shadowEngine';

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  dawn: Date;
  dusk: Date;
}

export function getSunTimes(date: Date, lat = STOCKHOLM.lat, lng = STOCKHOLM.lng): SunTimes {
  const times = SunCalc.getTimes(date, lat, lng);
  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    solarNoon: times.solarNoon,
    dawn: times.dawn,
    dusk: times.dusk,
  };
}

export function getSunPosition(date: Date, lat = STOCKHOLM.lat, lng = STOCKHOLM.lng) {
  const pos = SunCalc.getPosition(date, lat, lng);
  return {
    altitude: pos.altitude,
    azimuth: pos.azimuth,
    altitudeDeg: (pos.altitude * 180) / Math.PI,
    azimuthDeg: (pos.azimuth * 180) / Math.PI + 180,
  };
}

export function isNight(date: Date, lat = STOCKHOLM.lat, lng = STOCKHOLM.lng): boolean {
  const pos = SunCalc.getPosition(date, lat, lng);
  return pos.altitude < 0;
}

export function minutesToSunrise(date: Date, lat = STOCKHOLM.lat, lng = STOCKHOLM.lng): number | null {
  const times = getSunTimes(date, lat, lng);
  if (date < times.sunrise) {
    return Math.round((times.sunrise.getTime() - date.getTime()) / 60000);
  }
  // Next day's sunrise
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = getSunTimes(tomorrow, lat, lng);
  return Math.round((tomorrowTimes.sunrise.getTime() - date.getTime()) / 60000);
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

export function dateFromMinutes(minutesFromMidnight: number, baseDate: Date = new Date()): Date {
  const d = new Date(baseDate);
  d.setHours(Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0);
  return d;
}

export function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}
