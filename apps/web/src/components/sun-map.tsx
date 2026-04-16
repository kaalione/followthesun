'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_CONFIG, getMapStyle } from '@followthesun/map-core';
import {
  getSunPositionForShadow,
  checkVenuesSunStatus,
  extractBuildingsFromFeatures,
} from '@followthesun/sun-engine';
import { useVenues, type VenueWithSunStatus, type Venue } from '@followthesun/venue-data';
import { useAppStore } from '@/store';

const VENUE_SOURCE = 'venues';
const SUN_LAYER = 'venues-sun';
const SHADE_LAYER = 'venues-shade';
const UNKNOWN_LAYER = 'venues-unknown';
const LABEL_LAYER = 'venues-labels';
const BUILDINGS_3D_LAYER = 'buildings-3d';

function venueFeatureCollection(venues: VenueWithSunStatus[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: venues.map((v) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] },
      properties: {
        id: v.id,
        name: v.name,
        type: v.type,
        neighborhood: v.neighborhood,
        sunState: v.inSun === true ? 'sun' : v.inSun === false ? 'shade' : 'unknown',
      },
    })),
  };
}

/**
 * Try multiple source names to find the building source in MapTiler tiles.
 * MapTiler Streets v2 uses "maptiler_planet", but fallback to "openmaptiles" or others.
 */
function queryBuildingFeatures(map: maplibregl.Map): any[] {
  const possibleSources = ['maptiler_planet', 'openmaptiles', 'composite'];
  for (const sourceName of possibleSources) {
    try {
      const features = map.querySourceFeatures(sourceName, {
        sourceLayer: 'building',
      });
      if (features.length > 0) return features;
    } catch {
      // Source doesn't exist, try next
    }
  }
  // Last resort: query rendered features for any building-looking layer
  try {
    const style = map.getStyle();
    if (style?.layers) {
      const buildingLayers = style.layers
        .filter((l: any) => l['source-layer'] === 'building' || l.id.includes('building'))
        .map((l: any) => l.id);
      if (buildingLayers.length > 0) {
        return map.queryRenderedFeatures(undefined, { layers: buildingLayers });
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export default function SunMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || '';
  const selectedDate = useAppStore((s) => s.selectedDate);
  const showOnlySunny = useAppStore((s) => s.showOnlySunny);

  // Load venues from Overpass (with fallback to hardcoded)
  const { venues: rawVenues, isLoading: venuesLoading, source: venueSource }: { venues: Venue[]; isLoading: boolean; error: string | null; source: string } = useVenues();

  // Log venue source for debugging
  useEffect(() => {
    if (!venuesLoading) {
      console.log(`[FollowTheSun] Loaded ${rawVenues.length} venues from ${venueSource}`);
    }
  }, [venuesLoading, rawVenues.length, venueSource]);

  const updateSunStatus = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    const center = map.getCenter();
    const currentDate = useAppStore.getState().selectedDate;

    // Filter venues in viewport
    const visibleVenues = rawVenues.filter(
      (v: Venue) =>
        v.lng >= bounds.getWest() &&
        v.lng <= bounds.getEast() &&
        v.lat >= bounds.getSouth() &&
        v.lat <= bounds.getNorth()
    );

    // Extract buildings from map vector tiles
    const buildingFeatures = queryBuildingFeatures(map);
    const buildings = extractBuildingsFromFeatures(buildingFeatures);

    // Compute sun status
    const sunStatuses = checkVenuesSunStatus(
      visibleVenues,
      buildings,
      currentDate,
      center.lat,
      center.lng,
    );

    // Build full venue list with sun status
    const allVenues: VenueWithSunStatus[] = rawVenues.map((v: Venue) => ({
      ...v,
      inSun: sunStatuses.get(v.id) ?? null,
      lastChecked: new Date(),
    }));

    useAppStore.getState().setVenues(allVenues);

    // Update GeoJSON source on map
    const source = map.getSource(VENUE_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(venueFeatureCollection(allVenues));
    }
  }, [rawVenues]);

  // Main map initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapStyle(maptilerKey),
      center: MAP_CONFIG.initialCenter,
      zoom: MAP_CONFIG.initialZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      maxBounds: MAP_CONFIG.maxBounds,
      pitch: MAP_CONFIG.initialPitch,
      maxPitch: MAP_CONFIG.maxPitch,
      touchPitch: true,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;



    function debouncedUpdate() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => updateSunStatus(), 500);
    }

    map.on('load', () => {
      useAppStore.getState().setMapLoaded(true);

      // Add 3D buildings layer for visual depth
      addBuildings3DLayer(map);

      // Update lighting based on sun position
      updateMapLighting(map, useAppStore.getState().selectedDate);

      // Initial venue data (all unknown)
      const initialVenues: VenueWithSunStatus[] = rawVenues.map((v: Venue) => ({
        ...v,
        inSun: null,
        lastChecked: new Date(),
      }));
      useAppStore.getState().setVenues(initialVenues);

      // Add GeoJSON source
      map.addSource(VENUE_SOURCE, {
        type: 'geojson',
        data: venueFeatureCollection(initialVenues),
      });

      // Sun markers — bright orange circles
      map.addLayer({
        id: SUN_LAYER,
        type: 'circle',
        source: VENUE_SOURCE,
        filter: ['==', ['get', 'sunState'], 'sun'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 6, 15, 12, 18, 16],
          'circle-color': '#F5A623',
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 2.5,
          'circle-opacity': 1,
        },
      });

      // Shade markers — muted gray-blue
      map.addLayer({
        id: SHADE_LAYER,
        type: 'circle',
        source: VENUE_SOURCE,
        filter: ['==', ['get', 'sunState'], 'shade'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 5, 15, 10, 18, 14],
          'circle-color': '#94A3B8',
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.7,
        },
      });

      // Unknown markers — light gray
      map.addLayer({
        id: UNKNOWN_LAYER,
        type: 'circle',
        source: VENUE_SOURCE,
        filter: ['==', ['get', 'sunState'], 'unknown'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4, 15, 8, 18, 12],
          'circle-color': '#D1D5DB',
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 1,
          'circle-opacity': 0.5,
        },
      });

      // Labels at higher zoom
      map.addLayer({
        id: LABEL_LAYER,
        type: 'symbol',
        source: VENUE_SOURCE,
        minzoom: 14,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 1.8],
          'text-anchor': 'top',
          'text-max-width': 10,
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        },
        paint: {
          'text-color': '#1A1A1A',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 1.5,
        },
      });

      // Click interaction
      for (const layerId of [SUN_LAYER, SHADE_LAYER, UNKNOWN_LAYER]) {
        map.on('click', layerId, (e) => {
          if (e.features && e.features.length > 0) {
            const id = e.features[0].properties?.id;
            if (id) {
              useAppStore.getState().setSelectedVenueId(id);
            }
          }
        });

        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      }

      // Click elsewhere to deselect
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [SUN_LAYER, SHADE_LAYER, UNKNOWN_LAYER],
        });
        if (features.length === 0) {
          useAppStore.getState().setSelectedVenueId(null);
        }
      });

      // Shadow engine is ready — mark it so the UI stops showing "loading"
      useAppStore.getState().setShadowEngineReady(true);

      // Initial sun status calculation (wait briefly for tiles to load)
      setTimeout(() => updateSunStatus(), 1500);
    });

    map.on('moveend', debouncedUpdate);

    // Live mode: update time every 5 minutes
    const interval = setInterval(() => {
      if (useAppStore.getState().isLiveMode) {
        useAppStore.setState({ selectedDate: new Date() });
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [maptilerKey, rawVenues, updateSunStatus]);

  // Sync selectedDate changes → re-run shadow calculation + update lighting
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    updateMapLighting(map, selectedDate);

    // Debounce the shadow recalculation
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateSunStatus(), 300);
  }, [selectedDate, updateSunStatus]);

  // Toggle shade/unknown layers based on "Bara sol" filter
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const vis = showOnlySunny ? 'none' : 'visible';
    if (map.getLayer(SHADE_LAYER)) map.setLayoutProperty(SHADE_LAYER, 'visibility', vis);
    if (map.getLayer(UNKNOWN_LAYER)) map.setLayoutProperty(UNKNOWN_LAYER, 'visibility', vis);
  }, [showOnlySunny]);

  // Geolocation: "Near me" button
  const locateMeRequested = useAppStore((s) => s.locateMeRequested);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!locateMeRequested) return;
    const map = mapRef.current;
    if (!map) return;

    if (!navigator.geolocation) {
      console.warn('[FollowTheSun] Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo({ center: [longitude, latitude], zoom: 15, pitch: 50, duration: 1500 });

        // Add/move user position marker
        if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat([longitude, latitude]);
        } else {
          const el = document.createElement('div');
          el.style.width = '16px';
          el.style.height = '16px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#1B6CA8';
          el.style.border = '3px solid white';
          el.style.boxShadow = '0 0 0 3px rgba(27,108,168,0.3), 0 2px 6px rgba(0,0,0,0.3)';

          userMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .addTo(map);
        }
      },
      (err) => {
        console.warn('[FollowTheSun] Geolocation error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [locateMeRequested]);

  return (
    <div
      ref={mapContainerRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}

/**
 * Add 3D extruded buildings for visual depth (replaces ShadeMap visual overlay)
 */
function addBuildings3DLayer(map: maplibregl.Map) {
  // Find the first symbol layer to insert buildings below labels
  const layers = map.getStyle()?.layers;
  let firstSymbolId: string | undefined;
  if (layers) {
    for (const layer of layers) {
      if (layer.type === 'symbol') {
        firstSymbolId = layer.id;
        break;
      }
    }
  }

  // Find the correct source — MapTiler Streets v2 uses various source IDs
  const style = map.getStyle();
  let buildingSourceId = 'maptiler_planet';
  if (style?.sources) {
    if (style.sources['openmaptiles']) buildingSourceId = 'openmaptiles';
    if (style.sources['maptiler_planet']) buildingSourceId = 'maptiler_planet';
  }

  // Only add if the source exists and has building data
  try {
    map.addLayer(
      {
        id: BUILDINGS_3D_LAYER,
        type: 'fill-extrusion',
        source: buildingSourceId,
        'source-layer': 'building',
        paint: {
          'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'render_height'], ['get', 'height'], 9],
            0, '#e8e4dc',
            30, '#d4cfc4',
            60, '#c0bab0',
          ],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 9],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.6,
        },
      },
      firstSymbolId
    );
  } catch (err) {
    console.warn('[FollowTheSun] Could not add 3D buildings layer:', err);
  }
}

/**
 * Update map lighting to match sun position (gives realistic building shadows visually)
 */
function updateMapLighting(map: maplibregl.Map, date: Date) {
  const sunPos = getSunPositionForShadow(date, 59.3293, 18.0686);

  if (!sunPos.isAboveHorizon) {
    map.setLight({
      color: '#b8c3cc',
      intensity: 0.15,
      anchor: 'viewport',
      position: [1, 0, 80],
    });
    return;
  }

  // Convert SunCalc azimuth to MapLibre light position
  // SunCalc: 0 = south, clockwise. MapLibre: 0 = north, clockwise
  const azDeg = ((sunPos.azimuth * 180) / Math.PI + 180) % 360;
  const altDeg = Math.max(5, (sunPos.altitude * 180) / Math.PI);

  map.setLight({
    color: '#ffe8c8',
    intensity: 0.5,
    anchor: 'viewport',
    position: [1.5, azDeg, altDeg],
  });
}
