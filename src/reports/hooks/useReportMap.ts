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

// ── Scientific-style seagrass SVG (parameterised by colour) ──

function seagrassSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
<rect x="14" y="38" width="4" height="8" rx="1.5" fill="#8B7355" opacity="0.35"/>
<path d="M16 38 C14 30 11 20 9 8 C8.5 4 10 2 11 1" stroke="${color}" stroke-width="2.2" fill="none" opacity="0.65" stroke-linecap="round"/>
<path d="M16 38 C18 28 21 18 22 6 C22.5 2 21 0.5 20 0" stroke="${color}" stroke-width="1.8" fill="none" opacity="0.6" stroke-linecap="round"/>
<path d="M16 38 C15 32 13 24 12.5 14 C12 10 13 7 14 5" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.55" stroke-linecap="round"/>
<path d="M16 38 C17 33 18.5 26 19 18 C19.5 13 18.5 10 17.5 8" stroke="${color}" stroke-width="1.3" fill="none" opacity="0.5" stroke-linecap="round"/>
<path d="M15.5 36 C14 28 11.5 20 10 10" stroke="${color}" stroke-width="0.5" fill="none" opacity="0.25"/>
</svg>`;
}

function loadSvgImage(svg: string, w: number, h: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(w, h);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
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
  const animFrameRef = useRef<number>(0);

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
      cancelAnimationFrame(animFrameRef.current);
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
    async (missionColors: string[]) => {
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

      // Load mission-coloured seagrass icons
      await Promise.all(
        missionColors.map(async (color, i) => {
          const id = `seagrass-${i}`;
          if (map.hasImage(id)) return;
          const img = await loadSvgImage(seagrassSvg(color), 32, 48);
          if (!map.hasImage(id)) map.addImage(id, img);
        }),
      );

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

      // Seeds — soft glow circle underneath for mission colour
      map.addSource('seeds', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'seeds-glow',
        type: 'circle',
        source: 'seeds',
        paint: { 'circle-radius': 10, 'circle-color': colorExpr, 'circle-opacity': 0.1, 'circle-blur': 1 },
        layout: { visibility: 'none' },
      });

      // Seeds — seagrass icon layer
      const iconExpr: mapboxgl.Expression = [
        'concat', 'seagrass-', ['to-string', ['get', 'mission']],
      ];
      map.addLayer({
        id: 'seeds-icon',
        type: 'symbol',
        source: 'seeds',
        layout: {
          'icon-image': iconExpr,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.35, 14, 0.55, 17, 0.95],
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-rotate': ['get', 'baseRot'],
          visibility: 'none',
        },
        paint: {
          'icon-opacity': [
            'interpolate', ['linear'], ['get', 'depth'],
            0, 0.9,
            20, 0.6,
          ],
        },
      });

      // Wave animation — subtle sway
      const animate = () => {
        if (!mapRef.current || !mapRef.current.getLayer('seeds-icon')) return;
        const t = performance.now() / 1000;
        const offset = Math.sin(t * 0.9) * 4.5;
        mapRef.current.setLayoutProperty(
          'seeds-icon', 'icon-rotate',
          ['+', ['get', 'baseRot'], offset] as any,
        );
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);

      // Seed hover popup
      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
      map.on('mouseenter', 'seeds-icon', (e) => {
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
      map.on('mouseleave', 'seeds-icon', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });
    },
    [loaded],
  );

  // ── Update sector detail data ──
  const updateSectorData = useCallback(
    async (opts: {
      pathGeoJSON: GeoJSON.Feature;
      seedsGeoJSON: GeoJSON.FeatureCollection;
      bathymetryGeoJSON: GeoJSON.FeatureCollection;
      missionColors: string[];
    }) => {
      const map = mapRef.current;
      if (!map || !loaded) return;

      await ensureSectorDataLayers(opts.missionColors);
      missionColorsRef.current = opts.missionColors;

      (map.getSource('bathymetry') as mapboxgl.GeoJSONSource).setData(opts.bathymetryGeoJSON);
      (map.getSource('path') as mapboxgl.GeoJSONSource).setData(opts.pathGeoJSON);
      (map.getSource('seeds') as mapboxgl.GeoJSONSource).setData(opts.seedsGeoJSON);

      // Update glow colour expression
      const colorExpr: mapboxgl.Expression = [
        'match', ['get', 'mission'],
        ...opts.missionColors.flatMap((c, i) => [i, c]),
        '#ffffff',
      ];
      if (map.getLayer('seeds-glow')) map.setPaintProperty('seeds-glow', 'circle-color', colorExpr);
    },
    [loaded, ensureSectorDataLayers],
  );

  // ── Show / hide sector detail layers ──
  const setSectorDataVisible = useCallback(
    (visible: boolean) => {
      const map = mapRef.current;
      if (!map || !loaded) return;
      const layers = ['bathymetry-fill', 'path-glow', 'path-line', 'seeds-glow', 'seeds-icon'];
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

      ['seeds-icon', 'seeds-glow'].forEach((id) => {
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
