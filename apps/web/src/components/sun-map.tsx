'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_CONFIG, getMapStyle } from '@followthesun/map-core';
import {
  getSunPositionForShadow,
  checkVenuesSunStatus,
  extractBuildingsFromFeatures,
  projectBuildingShadows,
  getShadowOpacity,
  getSunDirectionText,
} from '@followthesun/sun-engine';
import { useVenues, type VenueWithSunStatus, type Venue } from '@followthesun/venue-data';
import { useAppStore } from '@/store';

const VENUE_SOURCE = 'venues';
const SUN_LAYER = 'venues-sun';
const SHADE_LAYER = 'venues-shade';
const UNKNOWN_LAYER = 'venues-unknown';
const LABEL_LAYER = 'venues-labels';
const BUILDINGS_3D_LAYER = 'buildings-3d';
const SHADOW_SOURCE = 'shadow-polygons';
const SHADOW_LAYER = 'shadow-overlay';
const SUN_RAY_SOURCE = 'sun-ray';
const SUN_RAY_LAYER = 'sun-ray-line';
const SUN_RAY_ARROW_LAYER = 'sun-ray-arrow';

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

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

/**
 * Build sun direction visualization:
 * - A warm triangular "sunshine wedge" showing the lit area
 * - A solid golden beam line pointing toward the sun
 * - A sun icon point at the tip
 */
function buildSunRayGeoJSON(
  center: [number, number], // [lng, lat]
  azimuth: number,          // radians, SunCalc convention (0=south, CW)
  altitude: number,         // radians
): GeoJSON.FeatureCollection {
  if (altitude <= 0) return EMPTY_FC;

  const sunBearingRad = azimuth;

  // Ray length scales with zoom — use a fixed degree offset (~250m)
  const rayLen = 0.0035;
  const wedgeSpread = 0.25; // radians (~14 degrees) half-angle of sunshine wedge

  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((center[1] * Math.PI) / 180);
  const ratio = metersPerDegLat / metersPerDegLng;

  // Sun tip point
  const dxSun = Math.sin(sunBearingRad) * rayLen * ratio;
  const dySun = Math.cos(sunBearingRad) * rayLen;
  const sunTip: [number, number] = [center[0] + dxSun, center[1] + dySun];

  // Sunshine wedge: triangular area from center, fanning toward the sun
  const wedgeLeft = sunBearingRad - wedgeSpread;
  const wedgeRight = sunBearingRad + wedgeSpread;
  const wedgeLen = rayLen * 1.2;

  const leftTip: [number, number] = [
    center[0] + Math.sin(wedgeLeft) * wedgeLen * ratio,
    center[1] + Math.cos(wedgeLeft) * wedgeLen,
  ];
  const rightTip: [number, number] = [
    center[0] + Math.sin(wedgeRight) * wedgeLen * ratio,
    center[1] + Math.cos(wedgeRight) * wedgeLen,
  ];

  return {
    type: 'FeatureCollection',
    features: [
      // Sunshine wedge (warm yellow triangle)
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[center, leftTip, rightTip, center]],
        },
        properties: { type: 'wedge' },
      },
      // Sun beam line (solid golden)
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [center, sunTip],
        },
        properties: { type: 'beam' },
      },
      // Sun icon point at the tip
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: sunTip,
        },
        properties: { type: 'sun-tip' },
      },
    ],
  };
}

/**
 * Try multiple source names to find buildings in MapTiler tiles.
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
  const showShadows = useAppStore((s) => s.showShadows);

  // Load venues from static snapshot + optional Overpass refresh
  const { venues: rawVenues, isLoading: venuesLoading, source: venueSource }: { venues: Venue[]; isLoading: boolean; error: string | null; source: string } = useVenues();

  useEffect(() => {
    if (!venuesLoading) {
      console.log(`[FollowTheSun] Loaded ${rawVenues.length} venues from ${venueSource}`);
    }
  }, [venuesLoading, rawVenues.length, venueSource]);

  /**
   * Core update: compute shadow polygons + venue sun status
   */
  const updateSunStatus = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    const center = map.getCenter();
    const currentDate = useAppStore.getState().selectedDate;
    const zoom = map.getZoom();

    // Get sun position
    const sunPos = getSunPositionForShadow(currentDate, center.lat, center.lng);

    // Update sun info in store
    const azDeg = ((sunPos.azimuth * 180) / Math.PI + 180 + 360) % 360;
    const altDeg = Math.max(0, (sunPos.altitude * 180) / Math.PI);
    useAppStore.getState().setSunInfoText(getSunDirectionText(sunPos.azimuth, sunPos.altitude));
    useAppStore.getState().setSunAngles(azDeg, altDeg);

    // === SUN DIRECTION RAY ===
    if (sunPos.isAboveHorizon) {
      const raySource = map.getSource(SUN_RAY_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (raySource) {
        const rayGeoJSON = buildSunRayGeoJSON(
          [center.lng, center.lat],
          sunPos.azimuth,
          sunPos.altitude,
        );
        raySource.setData(rayGeoJSON);
      }
    }

    // Extract buildings from vector tiles
    const buildingFeatures = queryBuildingFeatures(map);
    const buildings = extractBuildingsFromFeatures(buildingFeatures);

    // === SHADOW OVERLAY: project shadow polygons ===
    if (zoom >= 13.5 && sunPos.isAboveHorizon) {
      const shadowGeoJSON = projectBuildingShadows(buildings, sunPos, center.lat);

      const shadowSource = map.getSource(SHADOW_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (shadowSource) {
        shadowSource.setData(shadowGeoJSON);
      }

      // Adjust shadow opacity based on sun altitude
      if (map.getLayer(SHADOW_LAYER)) {
        map.setPaintProperty(SHADOW_LAYER, 'fill-opacity', getShadowOpacity(sunPos.altitude));
      }
    } else {
      // Too zoomed out or night — clear shadows
      const shadowSource = map.getSource(SHADOW_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (shadowSource) {
        shadowSource.setData(EMPTY_FC);
      }
    }

    // === VENUE SUN STATUS ===
    const visibleVenues = rawVenues.filter(
      (v: Venue) =>
        v.lng >= bounds.getWest() &&
        v.lng <= bounds.getEast() &&
        v.lat >= bounds.getSouth() &&
        v.lat <= bounds.getNorth()
    );

    const sunStatuses = checkVenuesSunStatus(
      visibleVenues,
      buildings,
      currentDate,
      center.lat,
      center.lng,
    );

    const allVenues: VenueWithSunStatus[] = rawVenues.map((v: Venue) => ({
      ...v,
      inSun: sunStatuses.get(v.id) ?? null,
      lastChecked: new Date(),
    }));

    useAppStore.getState().setVenues(allVenues);

    const source = map.getSource(VENUE_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(venueFeatureCollection(allVenues));
    }
  }, [rawVenues]);

  // ========== MAP INITIALIZATION ==========
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
      debounceRef.current = setTimeout(() => updateSunStatus(), 150);
    }

    map.on('load', () => {
      useAppStore.getState().setMapLoaded(true);

      // 1. Add 3D buildings
      addBuildings3DLayer(map);

      // 2. Add shadow overlay source + layer (BEFORE venue markers)
      map.addSource(SHADOW_SOURCE, {
        type: 'geojson',
        data: EMPTY_FC,
      });

      // Find the first symbol layer to insert shadow below labels
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

      map.addLayer(
        {
          id: SHADOW_LAYER,
          type: 'fill',
          source: SHADOW_SOURCE,
          paint: {
            'fill-color': '#1a1a2e',
            'fill-opacity': 0.4,
            'fill-antialias': true,
          },
        },
        firstSymbolId
      );

      // 3. Sun direction ray (visual indicator of where sunlight comes from)
      map.addSource(SUN_RAY_SOURCE, {
        type: 'geojson',
        data: EMPTY_FC,
      });

      // Sunshine wedge (warm golden triangle showing lit area)
      map.addLayer({
        id: SUN_RAY_LAYER,
        type: 'fill',
        source: SUN_RAY_SOURCE,
        filter: ['==', ['get', 'type'], 'wedge'],
        paint: {
          'fill-color': '#FFD060',
          'fill-opacity': 0.18,
        },
      });

      // Sun beam line (solid warm line toward sun)
      map.addLayer({
        id: SUN_RAY_ARROW_LAYER,
        type: 'line',
        source: SUN_RAY_SOURCE,
        filter: ['==', ['get', 'type'], 'beam'],
        paint: {
          'line-color': '#F5A623',
          'line-width': 5,
          'line-opacity': 0.7,
          'line-blur': 2,
        },
      });

      // Sun icon at the tip — load SVG image then add layer
      const sunImg = new Image(40, 40);
      sunImg.onload = () => {
        if (!map.hasImage('sun-icon')) {
          map.addImage('sun-icon', sunImg);
        }
        map.addLayer({
          id: 'sun-ray-tip',
          type: 'symbol',
          source: SUN_RAY_SOURCE,
          filter: ['==', ['get', 'type'], 'sun-tip'],
          layout: {
            'icon-image': 'sun-icon',
            'icon-size': 0.7,
            'icon-allow-overlap': true,
          },
        });
      };
      sunImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="22" fill="#F5A623"/>
          <circle cx="50" cy="50" r="18" fill="#FFD060"/>
          <g stroke="#F5A623" stroke-width="5" stroke-linecap="round">
            <line x1="50" y1="8" x2="50" y2="18"/>
            <line x1="50" y1="82" x2="50" y2="92"/>
            <line x1="8" y1="50" x2="18" y2="50"/>
            <line x1="82" y1="50" x2="92" y2="50"/>
            <line x1="20" y1="20" x2="27" y2="27"/>
            <line x1="73" y1="73" x2="80" y2="80"/>
            <line x1="80" y1="20" x2="73" y2="27"/>
            <line x1="27" y1="73" x2="20" y2="80"/>
          </g>
        </svg>`
      );

      // 4. Update lighting
      updateMapLighting(map, useAppStore.getState().selectedDate);

      // 4. Add venue sources + layers
      const initialVenues: VenueWithSunStatus[] = rawVenues.map((v: Venue) => ({
        ...v,
        inSun: null,
        lastChecked: new Date(),
      }));
      useAppStore.getState().setVenues(initialVenues);

      map.addSource(VENUE_SOURCE, {
        type: 'geojson',
        data: venueFeatureCollection(initialVenues),
      });

      // Sun markers — bright orange circles with glow
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
          'circle-color': '#64748B',
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.65,
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
            if (id) useAppStore.getState().setSelectedVenueId(id);
          }
        });
        map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
      }

      // Click elsewhere to deselect
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [SUN_LAYER, SHADE_LAYER, UNKNOWN_LAYER],
        });
        if (features.length === 0) useAppStore.getState().setSelectedVenueId(null);
      });

      // Shadow engine ready
      useAppStore.getState().setShadowEngineReady(true);

      // Initial calculation after tiles load
      setTimeout(() => updateSunStatus(), 1500);
    });

    map.on('moveend', debouncedUpdate);

    // Live mode: update every 5 minutes
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

  // Sync selectedDate → re-run shadows + lighting
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    updateMapLighting(map, selectedDate);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateSunStatus(), 200);
  }, [selectedDate, updateSunStatus]);

  // "Bara sol" filter
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const vis = showOnlySunny ? 'none' : 'visible';
    if (map.getLayer(SHADE_LAYER)) map.setLayoutProperty(SHADE_LAYER, 'visibility', vis);
    if (map.getLayer(UNKNOWN_LAYER)) map.setLayoutProperty(UNKNOWN_LAYER, 'visibility', vis);
  }, [showOnlySunny]);

  // Shadow overlay toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const vis = showShadows ? 'visible' : 'none';
    if (map.getLayer(SHADOW_LAYER)) map.setLayoutProperty(SHADOW_LAYER, 'visibility', vis);
    if (map.getLayer(SUN_RAY_LAYER)) map.setLayoutProperty(SUN_RAY_LAYER, 'visibility', vis);
    if (map.getLayer(SUN_RAY_ARROW_LAYER)) map.setLayoutProperty(SUN_RAY_ARROW_LAYER, 'visibility', vis);
    if (map.getLayer('sun-ray-tip')) map.setLayoutProperty('sun-ray-tip', 'visibility', vis);
  }, [showShadows]);

  // Geolocation: "Near me"
  const locateMeRequested = useAppStore((s) => s.locateMeRequested);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!locateMeRequested) return;
    const map = mapRef.current;
    if (!map || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo({ center: [longitude, latitude], zoom: 15, pitch: 50, duration: 1500 });

        if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat([longitude, latitude]);
        } else {
          const el = document.createElement('div');
          el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#1B6CA8;border:3px solid white;box-shadow:0 0 0 3px rgba(27,108,168,0.3),0 2px 6px rgba(0,0,0,0.3)';
          userMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .addTo(map);
        }
      },
      (err) => console.warn('[FollowTheSun] Geolocation error:', err.message),
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

// ========== Helper Functions ==========

function addBuildings3DLayer(map: maplibregl.Map) {
  const layers = map.getStyle()?.layers;
  let firstSymbolId: string | undefined;
  if (layers) {
    for (const layer of layers) {
      if (layer.type === 'symbol') { firstSymbolId = layer.id; break; }
    }
  }

  const style = map.getStyle();
  let buildingSourceId = 'maptiler_planet';
  if (style?.sources) {
    if (style.sources['openmaptiles']) buildingSourceId = 'openmaptiles';
    if (style.sources['maptiler_planet']) buildingSourceId = 'maptiler_planet';
  }

  try {
    map.addLayer(
      {
        id: BUILDINGS_3D_LAYER,
        type: 'fill-extrusion',
        source: buildingSourceId,
        'source-layer': 'building',
        paint: {
          'fill-extrusion-color': [
            'interpolate', ['linear'],
            ['coalesce', ['get', 'render_height'], ['get', 'height'], 9],
            0, '#e8e4dc', 30, '#d4cfc4', 60, '#c0bab0',
          ],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 9],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.6,
        },
      },
      firstSymbolId
    );
  } catch (err) {
    console.warn('[FollowTheSun] Could not add 3D buildings:', err);
  }
}

function updateMapLighting(map: maplibregl.Map, date: Date) {
  const sunPos = getSunPositionForShadow(date, 59.3293, 18.0686);

  if (!sunPos.isAboveHorizon) {
    map.setLight({ color: '#b8c3cc', intensity: 0.15, anchor: 'viewport', position: [1, 0, 80] });
    return;
  }

  const azDeg = ((sunPos.azimuth * 180) / Math.PI + 180) % 360;
  const altDeg = Math.max(5, (sunPos.altitude * 180) / Math.PI);

  map.setLight({ color: '#ffe8c8', intensity: 0.5, anchor: 'viewport', position: [1.5, azDeg, altDeg] });
}
