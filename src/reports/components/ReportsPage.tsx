import React, { useRef, useMemo, useCallback } from 'react';
import ReportSidebar from './ReportSidebar';
import MapOverlay, { DEFAULT_LAYERS } from './MapOverlay';
import useReportMap from '../hooks/useReportMap';
import {
  MISSION_COLORS,
  MAP_CENTER,
  generatePath,
  generateSeeds,
  generateBathymetryGeoJSON,
  seedsToGeoJSON,
  pathToGeoJSON,
  buildReportData,
} from '../data/sampleData';
import styles from './ReportsPage.module.css';

interface ReportsPageProps {
  /** Your Mapbox access token */
  mapboxToken: string;
  /** Optional: override Mapbox style URL */
  mapStyle?: string;
}

export default function ReportsPage({ mapboxToken, mapStyle }: ReportsPageProps) {
  const mapContainer = useRef<HTMLDivElement>(null);

  // ── Generate data (replace with real API calls / props) ──
  const { path, seeds, bathymetry, seedsGJ, pathGJ, reportData, totalSeeds } = useMemo(() => {
    const path = generatePath();
    const seeds = generateSeeds(path);
    return {
      path,
      seeds,
      bathymetry: generateBathymetryGeoJSON(),
      seedsGJ: seedsToGeoJSON(seeds),
      pathGJ: pathToGeoJSON(path),
      reportData: buildReportData(seeds),
      totalSeeds: seeds.length,
    };
  }, []);

  // ── Map hook ──
  const { setLayerVisibility, filterMissions } = useReportMap({
    container: mapContainer,
    accessToken: mapboxToken,
    center: MAP_CENTER,
    style: mapStyle,
    pathGeoJSON: pathGJ,
    seedsGeoJSON: seedsGJ,
    bathymetryGeoJSON: bathymetry,
    missionColors: MISSION_COLORS,
  });

  // ── Callbacks for sidebar → map ──
  const handleMissionVisibility = useCallback(
    (visibleIds: number[]) => filterMissions(visibleIds),
    [filterMissions]
  );

  const handleMapLayerToggle = useCallback(
    (layerIds: string[], active: boolean) => setLayerVisibility(layerIds, active),
    [setLayerVisibility]
  );

  const handleOverlayToggle = useCallback(
    (layerIds: string[], visible: boolean) => setLayerVisibility(layerIds, visible),
    [setLayerVisibility]
  );

  return (
    <div className={styles.page}>
      <ReportSidebar
        data={reportData}
        totalSeeds={totalSeeds}
        onMissionVisibilityChange={handleMissionVisibility}
        onMapLayerToggle={handleMapLayerToggle}
      />
      <div className={styles.mapArea}>
        <div ref={mapContainer} className={styles.map} />
        <MapOverlay layers={DEFAULT_LAYERS} onToggle={handleOverlayToggle} />
      </div>
    </div>
  );
}
