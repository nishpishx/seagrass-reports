import { useRef, useEffect, useCallback, useState, type RefObject } from 'react';
import mapboxgl from 'mapbox-gl';

interface UsePlanMapOptions {
  container: RefObject<HTMLDivElement | null>;
  accessToken: string;
  center?: [number, number];
  zoom?: number;
  style?: string;
}

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

export default function usePlanMap({
  container,
  accessToken,
  center = [0, 20],
  zoom = 2,
  style = 'mapbox://styles/mapbox/dark-v11',
}: UsePlanMapOptions) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const clickCbRef = useRef<((lngLat: [number, number]) => void) | null>(null);

  // ── Init map ──
  useEffect(() => {
    if (!container.current || mapRef.current) return;

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: container.current,
      style,
      center,
      zoom,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    map.on('load', () => setLoaded(true));

    // Global click handler that dispatches to the registered callback
    map.on('click', (e) => {
      if (clickCbRef.current) {
        const cb = clickCbRef.current;
        clickCbRef.current = null;
        map.getCanvas().style.cursor = '';
        cb([e.lngLat.lng, e.lngLat.lat]);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setLoaded(false);
    };
  }, [container, accessToken]);

  // ── Fly to ──
  const flyTo = useCallback((target: [number, number], z: number) => {
    mapRef.current?.flyTo({ center: target, zoom: z, duration: 1500 });
  }, []);

  // ── Sector polygons (saved sectors) ──
  const setSectorPolygons = useCallback(
    (geojson: GeoJSON.FeatureCollection | null) => {
      const map = mapRef.current;
      if (!map || !loaded) return;

      const src = map.getSource('plan-sectors') as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData(geojson ?? EMPTY_FC);
      } else if (geojson) {
        map.addSource('plan-sectors', { type: 'geojson', data: geojson });
        map.addLayer({
          id: 'plan-sectors-fill',
          type: 'fill',
          source: 'plan-sectors',
          paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.12 },
        });
        map.addLayer({
          id: 'plan-sectors-outline',
          type: 'line',
          source: 'plan-sectors',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-opacity': 0.7,
            'line-dasharray': [3, 2],
          },
        });
        map.addLayer({
          id: 'plan-sectors-label',
          type: 'symbol',
          source: 'plan-sectors',
          layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-anchor': 'center' },
          paint: {
            'text-color': '#dfe8f1',
            'text-halo-color': '#0b1420',
            'text-halo-width': 1.5,
          },
        });

        // Hover
        map.on('mouseenter', 'plan-sectors-fill', () => {
          if (!clickCbRef.current) map.getCanvas().style.cursor = 'pointer';
          map.setPaintProperty('plan-sectors-fill', 'fill-opacity', 0.22);
        });
        map.on('mouseleave', 'plan-sectors-fill', () => {
          if (!clickCbRef.current) map.getCanvas().style.cursor = '';
          map.setPaintProperty('plan-sectors-fill', 'fill-opacity', 0.12);
        });
      }
    },
    [loaded],
  );

  // ── Draft sector preview ──
  const setDraftSector = useCallback(
    (geojson: GeoJSON.FeatureCollection | null) => {
      const map = mapRef.current;
      if (!map || !loaded) return;

      const src = map.getSource('plan-draft') as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData(geojson ?? EMPTY_FC);
      } else {
        map.addSource('plan-draft', { type: 'geojson', data: geojson ?? EMPTY_FC });
        map.addLayer({
          id: 'plan-draft-fill',
          type: 'fill',
          source: 'plan-draft',
          paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.18 },
        });
        map.addLayer({
          id: 'plan-draft-outline',
          type: 'line',
          source: 'plan-draft',
          paint: {
            'line-color': '#38bdf8',
            'line-width': 2.5,
            'line-opacity': 0.9,
            'line-dasharray': [4, 3],
          },
        });
      }
    },
    [loaded],
  );

  // ── Site marker ──
  const setSiteMarker = useCallback(
    (lngLat: [number, number] | null) => {
      const map = mapRef.current;
      if (!map || !loaded) return;

      const fc: GeoJSON.FeatureCollection = lngLat
        ? {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: { type: 'Point', coordinates: lngLat },
              },
            ],
          }
        : EMPTY_FC;

      const src = map.getSource('plan-site-marker') as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData(fc);
      } else {
        map.addSource('plan-site-marker', { type: 'geojson', data: fc });
        map.addLayer({
          id: 'plan-site-marker-glow',
          type: 'circle',
          source: 'plan-site-marker',
          paint: { 'circle-radius': 16, 'circle-color': '#34d399', 'circle-opacity': 0.15, 'circle-blur': 1 },
        });
        map.addLayer({
          id: 'plan-site-marker-dot',
          type: 'circle',
          source: 'plan-site-marker',
          paint: {
            'circle-radius': 6,
            'circle-color': '#34d399',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });
      }
    },
    [loaded],
  );

  // ── Click-to-place ──
  const onMapClick = useCallback((cb: (lngLat: [number, number]) => void) => {
    clickCbRef.current = cb;
    const map = mapRef.current;
    if (map) map.getCanvas().style.cursor = 'crosshair';
  }, []);

  const clearMapClick = useCallback(() => {
    clickCbRef.current = null;
    const map = mapRef.current;
    if (map) map.getCanvas().style.cursor = '';
  }, []);

  return {
    map: mapRef,
    loaded,
    flyTo,
    setSectorPolygons,
    setDraftSector,
    setSiteMarker,
    onMapClick,
    clearMapClick,
  };
}
