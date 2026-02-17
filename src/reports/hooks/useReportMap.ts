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

/** Compute centroid from a polygon ring (skips closing coordinate). */
function polygonCentroid(ring: number[][]): [number, number] {
  const pts = ring.slice(0, -1);
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ];
}

/** Convert polygon FeatureCollection → point FeatureCollection at centroids.
 *  Point features (e.g. site-level labels) are passed through as-is. */
function toLabelPoints(fc: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f) => {
      if (f.geometry.type === 'Point') return f;
      return {
        type: 'Feature' as const,
        properties: f.properties,
        geometry: {
          type: 'Point' as const,
          coordinates: polygonCentroid((f.geometry as GeoJSON.Polygon).coordinates[0]),
        },
      };
    }),
  };
}

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
        (map.getSource('sectors-label-pts') as mapboxgl.GeoJSONSource)?.setData(
          geojson ? toLabelPoints(geojson) : EMPTY_FC,
        );
      } else if (geojson) {
        map.addSource('sectors', { type: 'geojson', data: geojson });
        map.addSource('sectors-label-pts', { type: 'geojson', data: toLabelPoints(geojson) });
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
          source: 'sectors-label-pts',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': ['match', ['get', 'labelType'], 'site', 14, 12],
            'text-font': [
              'match', ['get', 'labelType'],
              'site', ['literal', ['DIN Pro Bold', 'Arial Unicode MS Bold']],
              ['literal', ['DIN Pro Medium', 'Arial Unicode MS Regular']],
            ],
            'text-anchor': 'center',
            'symbol-sort-key': ['match', ['get', 'labelType'], 'site', 0, 1],
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': '#dfe8f1',
            'text-halo-color': '#0b1420',
            'text-halo-width': ['match', ['get', 'labelType'], 'site', 2, 1.5],
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

  // ── Lazily create live-mode layers (robot + trail) ──
  const ensureLiveLayers = useCallback(
    () => {
      const map = mapRef.current;
      if (!map || !loaded) return;
      if (map.getSource('robot')) return;

      // Live path trail
      map.addSource('live-path', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });
      map.addLayer({
        id: 'live-path-glow',
        type: 'line',
        source: 'live-path',
        paint: { 'line-color': '#34d399', 'line-width': 8, 'line-opacity': 0.12, 'line-blur': 6 },
      });
      map.addLayer({
        id: 'live-path-line',
        type: 'line',
        source: 'live-path',
        paint: { 'line-color': '#34d399', 'line-width': 2.5, 'line-opacity': 0.8 },
      });

      // Robot position
      map.addSource('robot', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'robot-pulse',
        type: 'circle',
        source: 'robot',
        paint: { 'circle-radius': 18, 'circle-color': '#34d399', 'circle-opacity': 0.15, 'circle-blur': 1 },
      });
      map.addLayer({
        id: 'robot-dot',
        type: 'circle',
        source: 'robot',
        paint: {
          'circle-radius': 7,
          'circle-color': '#34d399',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1,
        },
      });
    },
    [loaded],
  );

  // ── Push live feed data to map sources ──
  const updateLiveData = useCallback(
    (opts: {
      robotPosition: GeoJSON.Feature<GeoJSON.Point> | null;
      seedDrops: GeoJSON.FeatureCollection<GeoJSON.Point>;
      pathTrail: GeoJSON.Feature<GeoJSON.LineString>;
    }) => {
      const map = mapRef.current;
      if (!map || !loaded) return;

      ensureLiveLayers();

      if (opts.robotPosition) {
        (map.getSource('robot') as mapboxgl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [opts.robotPosition],
        });
      }
      (map.getSource('live-path') as mapboxgl.GeoJSONSource).setData(opts.pathTrail);

      // Update existing seeds source with live drops
      const seedsSrc = map.getSource('seeds') as mapboxgl.GeoJSONSource | undefined;
      if (seedsSrc) {
        seedsSrc.setData(opts.seedDrops);
      }
    },
    [loaded, ensureLiveLayers],
  );

  // ── Show / hide live-mode layers ──
  const setLiveLayersVisible = useCallback(
    (visible: boolean) => {
      const map = mapRef.current;
      if (!map || !loaded) return;
      ['robot-pulse', 'robot-dot', 'live-path-glow', 'live-path-line'].forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
        }
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
    ensureLiveLayers,
    updateLiveData,
    setLiveLayersVisible,
  };
}
