import { useRef, useEffect, useCallback, useState, type RefObject } from 'react';
import mapboxgl from 'mapbox-gl';

interface UseReportMapOptions {
  container: RefObject<HTMLDivElement | null>;
  accessToken: string;
  center: [number, number];
  zoom?: number;
  style?: string | mapboxgl.Style;
}

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

export default function useReportMap({
  container,
  accessToken,
  center,
  zoom = 3,
  style = 'mapbox://styles/mapbox/dark-v11',
}: UseReportMapOptions) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const missionColorsRef = useRef<string[]>([]);

  // ── Init map (runs once) ──
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

    map.on('load', () => {
      setLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setLoaded(false);
    };
  }, [container, accessToken]);

  // ── Fly to a location ──
  const flyTo = useCallback(
    (target: [number, number], z: number) => {
      const map = mapRef.current;
      if (!map) return;
      map.flyTo({ center: target, zoom: z, duration: 1500 });
    },
    [],
  );

  // ── Sector polygons (site overview) ──
  const setSectorPolygons = useCallback(
    (geojson: GeoJSON.FeatureCollection | null) => {
      const map = mapRef.current;
      if (!map || !loaded) return;

      const src = map.getSource('sectors') as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData(geojson ?? EMPTY_FC);
      } else if (geojson) {
        map.addSource('sectors', { type: 'geojson', data: geojson });
        map.addLayer({
          id: 'sectors-fill',
          type: 'fill',
          source: 'sectors',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.12,
          },
        });
        map.addLayer({
          id: 'sectors-outline',
          type: 'line',
          source: 'sectors',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-opacity': 0.7,
            'line-dasharray': [3, 2],
          },
        });
        map.addLayer({
          id: 'sectors-label',
          type: 'symbol',
          source: 'sectors',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 12,
            'text-anchor': 'center',
          },
          paint: {
            'text-color': '#dfe8f1',
            'text-halo-color': '#0b1420',
            'text-halo-width': 1.5,
          },
        });

        // Hover: highlight
        map.on('mouseenter', 'sectors-fill', () => {
          map.getCanvas().style.cursor = 'pointer';
          map.setPaintProperty('sectors-fill', 'fill-opacity', 0.22);
        });
        map.on('mouseleave', 'sectors-fill', () => {
          map.getCanvas().style.cursor = '';
          map.setPaintProperty('sectors-fill', 'fill-opacity', 0.12);
        });
      }
    },
    [loaded],
  );

  // ── Show / hide sector polygon layers ──
  const setSectorPolygonsVisible = useCallback(
    (visible: boolean) => {
      const map = mapRef.current;
      if (!map || !loaded) return;
      ['sectors-fill', 'sectors-outline', 'sectors-label'].forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
        }
      });
    },
    [loaded],
  );

  // ── Lazily ensure a GeoJSON source + layers exist ──
  const ensureSectorDataLayers = useCallback(
    (missionColors: string[]) => {
      const map = mapRef.current;
      if (!map || !loaded) return;
      missionColorsRef.current = missionColors;

      // Already created?
      if (map.getSource('bathymetry')) return;

      const colorExpr: mapboxgl.Expression = [
        'match', ['get', 'mission'],
        ...missionColors.flatMap((c, i) => [i, c]),
        '#ffffff',
      ];

      // Bathymetry
      map.addSource('bathymetry', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'bathymetry-fill',
        type: 'fill',
        source: 'bathymetry',
        paint: {
          'fill-color': [
            'interpolate', ['linear'], ['get', 'depth'],
            0, '#a8edea', 5, '#5ec4c9', 10, '#38bdf8',
            18, '#1e60a0', 28, '#0f2d50', 40, '#091728',
          ],
          'fill-opacity': 0.35,
        },
        layout: { visibility: 'none' },
      });

      // Path
      map.addSource('path', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } } });
      map.addLayer({
        id: 'path-glow',
        type: 'line',
        source: 'path',
        paint: { 'line-color': '#fff', 'line-width': 8, 'line-opacity': 0.08, 'line-blur': 6 },
        layout: { visibility: 'none' },
      });
      map.addLayer({
        id: 'path-line',
        type: 'line',
        source: 'path',
        paint: { 'line-color': '#fff', 'line-width': 2, 'line-opacity': 0.55, 'line-dasharray': [3, 2.5] },
        layout: { visibility: 'none' },
      });

      // Seeds
      map.addSource('seeds', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'seeds-glow',
        type: 'circle',
        source: 'seeds',
        paint: { 'circle-radius': 7, 'circle-color': colorExpr, 'circle-opacity': 0.15, 'circle-blur': 1 },
        layout: { visibility: 'none' },
      });
      map.addLayer({
        id: 'seeds-dot',
        type: 'circle',
        source: 'seeds',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2, 14, 3.5, 17, 6],
          'circle-color': colorExpr,
          'circle-opacity': 0.88,
          'circle-stroke-width': 0.5,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
        },
        layout: { visibility: 'none' },
      });

      // Seed hover popup
      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
      map.on('mouseenter', 'seeds-dot', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties!;
        const color = missionColorsRef.current[p.mission] ?? '#fff';
        popup
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(
            `<div style="font-weight:600;color:${color};margin-bottom:3px">${p.missionName}</div>` +
            `<div style="color:var(--rpt-text-3)">Depth: ${p.depth}m · ${p.date}</div>`,
          )
          .addTo(map);
      });
      map.on('mouseleave', 'seeds-dot', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });
    },
    [loaded],
  );

  // ── Update sector detail data ──
  const updateSectorData = useCallback(
    (opts: {
      pathGeoJSON: GeoJSON.Feature;
      seedsGeoJSON: GeoJSON.FeatureCollection;
      bathymetryGeoJSON: GeoJSON.FeatureCollection;
      missionColors: string[];
    }) => {
      const map = mapRef.current;
      if (!map || !loaded) return;

      ensureSectorDataLayers(opts.missionColors);
      missionColorsRef.current = opts.missionColors;

      (map.getSource('bathymetry') as mapboxgl.GeoJSONSource).setData(opts.bathymetryGeoJSON);
      (map.getSource('path') as mapboxgl.GeoJSONSource).setData(opts.pathGeoJSON);
      (map.getSource('seeds') as mapboxgl.GeoJSONSource).setData(opts.seedsGeoJSON);

      // Update color expression
      const colorExpr: mapboxgl.Expression = [
        'match', ['get', 'mission'],
        ...opts.missionColors.flatMap((c, i) => [i, c]),
        '#ffffff',
      ];
      if (map.getLayer('seeds-dot')) map.setPaintProperty('seeds-dot', 'circle-color', colorExpr);
      if (map.getLayer('seeds-glow')) map.setPaintProperty('seeds-glow', 'circle-color', colorExpr);
    },
    [loaded, ensureSectorDataLayers],
  );

  // ── Show / hide sector detail layers ──
  const setSectorDataVisible = useCallback(
    (visible: boolean) => {
      const map = mapRef.current;
      if (!map || !loaded) return;
      const layers = ['bathymetry-fill', 'path-glow', 'path-line', 'seeds-glow', 'seeds-dot'];
      layers.forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
        }
      });
    },
    [loaded],
  );

  // ── Layer visibility toggle (for MapOverlay) ──
  const setLayerVisibility = useCallback(
    (layerIds: string[], visible: boolean) => {
      const map = mapRef.current;
      if (!map || !loaded) return;
      layerIds.forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
        }
      });
    },
    [loaded],
  );

  // ── Filter seeds by visible mission IDs ──
  const filterMissions = useCallback(
    (visibleMissionIds: number[]) => {
      const map = mapRef.current;
      if (!map || !loaded) return;

      let filter: any[] | null = null;
      if (visibleMissionIds.length === missionColorsRef.current.length) {
        filter = null;
      } else if (visibleMissionIds.length === 0) {
        filter = ['==', ['get', 'mission'], -1];
      } else {
        filter = ['any', ...visibleMissionIds.map((id) => ['==', ['get', 'mission'], id])] as any;
      }

      ['seeds-dot', 'seeds-glow'].forEach((id) => {
        if (map.getLayer(id)) map.setFilter(id, filter);
      });
    },
    [loaded],
  );

  return {
    map: mapRef,
    loaded,
    flyTo,
    setSectorPolygons,
    setSectorPolygonsVisible,
    updateSectorData,
    setSectorDataVisible,
    setLayerVisibility,
    filterMissions,
  };
}
