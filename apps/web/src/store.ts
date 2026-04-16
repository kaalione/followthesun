import { create } from 'zustand';
import type { VenueWithSunStatus } from '@followthesun/venue-data';

interface AppState {
  // Time
  selectedDate: Date;
  isLiveMode: boolean;
  setSelectedDate: (date: Date) => void;
  setLiveMode: (live: boolean) => void;

  // Venues
  venues: VenueWithSunStatus[];
  setVenues: (venues: VenueWithSunStatus[]) => void;
  selectedVenueId: string | null;
  setSelectedVenueId: (id: string | null) => void;

  // Filter
  showOnlySunny: boolean;
  setShowOnlySunny: (v: boolean) => void;

  // Map state
  isMapLoaded: boolean;
  setMapLoaded: (loaded: boolean) => void;
  isShadowEngineReady: boolean;
  setShadowEngineReady: (ready: boolean) => void;

  // Geolocation
  locateMeRequested: number; // timestamp, incremented to trigger flyTo
  requestLocateMe: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedDate: new Date(),
  isLiveMode: true,
  setSelectedDate: (date) => set({ selectedDate: date, isLiveMode: false }),
  setLiveMode: (live) => set((state) => ({ isLiveMode: live, selectedDate: live ? new Date() : state.selectedDate })),

  venues: [],
  setVenues: (venues) => set({ venues }),
  selectedVenueId: null,
  setSelectedVenueId: (id) => set({ selectedVenueId: id }),

  showOnlySunny: false,
  setShowOnlySunny: (v) => set({ showOnlySunny: v }),

  isMapLoaded: false,
  setMapLoaded: (loaded) => set({ isMapLoaded: loaded }),
  isShadowEngineReady: false,
  setShadowEngineReady: (ready) => set({ isShadowEngineReady: ready }),

  locateMeRequested: 0,
  requestLocateMe: () => set({ locateMeRequested: Date.now() }),
}));
