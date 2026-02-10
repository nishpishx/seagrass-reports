import { useRef, useEffect, useCallback, useState, type RefObject } from 'react';
import mapboxgl from 'mapbox-gl';

interface UseReportMapOptions {
  container: RefObject<HTMLDivElement | null>;
  accessToken: string;
  center: [number, number];
  zoom?: number;
  /** Mapbox style URL or inline style object. Defaults to dark-v11. */
  style?: string | mapboxgl.Style;
  pathGeoJSON: GeoJSON.Feature | null;
  seedsGeoJSON: GeoJSON.FeatureCollection | null;
  bathymetryGeoJSON: GeoJSON.FeatureCollection | null;
  missionColors: string[];
}

export default function useReportMap({
  container,
  accessToken,
  center,
  zoom = 13.5,
  style = 'mapbox://styles/mapbox/dark-v11',
  pathGeoJSON,
  seedsGeoJSON,
  bathymetryGeoJSON,
  missionColors,
}: UseReportMapOptions) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

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

    map.on('load', () => {
      // ── Bathymetry ──
      if (bathymetryGeoJSON) {
        map.addSource('bathymetry', { type: 'geojson', data: bathymetryGeoJSON });
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
        });
      }

      // ── Path ──
      if (pathGeoJSON) {
        map.addSource('path', { type: 'geojson', data: pathGeoJSON });
        map.addLayer({
          id: 'path-glow',
          type: 'line',
          source: 'path',
          paint: { 'line-color': '#fff', 'line-width': 8, 'line-opacity': 0.08, 'line-blur': 6 },
        });
        map.addLayer({
          id: 'path-line',
          type: 'line',
          source: 'path',
          paint: {
            'line-color': '#fff',
            'line-width': 2,
            'line-opacity': 0.55,
            'line-dasharray': [3, 2.5],
          },
        });
      }

      // ── Seeds ──
      if (seedsGeoJSON) {
        const colorExpr: mapboxgl.Expression = [
          'match', ['get', 'mission'],
          ...missionColors.flatMap((c, i) => [i, c]),
          '#ffffff',
        ];

        map.addSource('seeds', { type: 'geojson', data: seedsGeoJSON });
        map.addLayer({
          id: 'seeds-glow',
          type: 'circle',
          source: 'seeds',
          paint: {
            'circle-radius': 7,
            'circle-color': colorExpr,
            'circle-opacity': 0.15,
            'circle-blur': 1,
          },
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
        });

        // ── Hover popup ──
        const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
        map.on('mouseenter', 'seeds-dot', (e) => {
          map.getCanvas().style.cursor = 'pointer';
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties!;
          const color = missionColors[p.mission] ?? '#fff';
          popup
            .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
            .setHTML(
              `<div style="font-weight:600;color:${color};margin-bottom:3px">${p.missionName}</div>` +
              `<div style="color:var(--rpt-text-3)">Depth: ${p.depth}m · ${p.date}</div>`
            )
            .addTo(map);
        });
        map.on('mouseleave', 'seeds-dot', () => {
          map.getCanvas().style.cursor = '';
          popup.remove();
        });
      }

      // ── Fit bounds to path ──
      if (pathGeoJSON) {
        const coords = (pathGeoJSON.geometry as GeoJSON.LineString).coordinates as [number, number][];
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new mapboxgl.LngLatBounds(coords[0], coords[0])
        );
        map.fitBounds(bounds, { padding: 80 });
      }

      setLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setLoaded(false);
    };
  }, [container, accessToken]); // Only init once

  // ── Layer visibility toggle ──
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
    [loaded]
  );

  // ── Filter seeds by visible mission IDs ──
  const filterMissions = useCallback(
    (visibleMissionIds: number[]) => {
      const map = mapRef.current;
      if (!map || !loaded) return;

      let filter: any[] | null = null;
      if (visibleMissionIds.length === missionColors.length) {
        filter = null; // show all
      } else if (visibleMissionIds.length === 0) {
        filter = ['==', ['get', 'mission'], -1]; // hide all
      } else {
        filter = ['any', ...visibleMissionIds.map((id) => ['==', ['get', 'mission'], id])] as any;
      }

      ['seeds-dot', 'seeds-glow'].forEach((id) => {
        if (map.getLayer(id)) map.setFilter(id, filter);
      });
    },
    [loaded, missionColors.length]
  );

  return { map: mapRef, loaded, setLayerVisibility, filterMissions };
}
