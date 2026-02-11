import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import ReportSidebar from './ReportSidebar';
import MapOverlay, { DEFAULT_LAYERS } from './MapOverlay';
import useReportMap from '../hooks/useReportMap';
import { STUDY_SITES, generateSectorData, buildSiteSummary, sectorsToGeoJSON } from '../data/studySites';
import type { SectorData } from '../types';
import styles from './ReportsPage.module.css';

interface ReportsPageProps {
  mapboxToken: string;
  mapStyle?: string;
}

export default function ReportsPage({ mapboxToken, mapStyle }: ReportsPageProps) {
  const mapContainer = useRef<HTMLDivElement>(null);

  // ── Site / sector selection ──
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(STUDY_SITES[0].id);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

  const selectedSite = STUDY_SITES.find((s) => s.id === selectedSiteId) ?? null;
  const selectedSector = selectedSite?.sectors.find((s) => s.id === selectedSectorId) ?? null;

  // ── Generate sector data for selected site ──
  const sectorDataMap = useMemo(() => {
    const map = new Map<string, SectorData>();
    if (!selectedSite) return map;
    for (const sector of selectedSite.sectors) {
      map.set(sector.id, generateSectorData(sector, selectedSite.name));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId]);

  const activeSectorData = selectedSectorId ? sectorDataMap.get(selectedSectorId) ?? null : null;

  const siteSummary = useMemo(() => {
    if (!selectedSite) return null;
    return buildSiteSummary(selectedSite, sectorDataMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, sectorDataMap]);

  // ── Map hook ──
  const {
    map: mapRef,
    loaded,
    flyTo,
    setSectorPolygons,
    setSectorPolygonsVisible,
    updateSectorData,
    setSectorDataVisible,
    setLayerVisibility,
    filterMissions,
  } = useReportMap({
    container: mapContainer,
    accessToken: mapboxToken,
    center: selectedSite?.center ?? [0, 20],
    zoom: selectedSite?.zoom ?? 3,
    style: mapStyle,
  });

  // ── Effect: site changed → fly to site, show sector polygons ──
  useEffect(() => {
    if (!selectedSite || !loaded) return;
    flyTo(selectedSite.center, selectedSite.zoom);
    setSectorPolygons(sectorsToGeoJSON(selectedSite.sectors));
    setSectorPolygonsVisible(true);
    setSectorDataVisible(false);
  }, [selectedSiteId, loaded, flyTo, setSectorPolygons, setSectorPolygonsVisible, setSectorDataVisible, selectedSite]);

  // ── Effect: sector changed → zoom to sector & load data, or back to site ──
  useEffect(() => {
    if (!loaded) return;

    if (activeSectorData && selectedSector) {
      flyTo(selectedSector.center, 14.5);
      updateSectorData({
        pathGeoJSON: activeSectorData.pathGeoJSON,
        seedsGeoJSON: activeSectorData.seedsGeoJSON,
        bathymetryGeoJSON: activeSectorData.bathymetryGeoJSON,
        missionColors: activeSectorData.missionColors,
      });
      setSectorDataVisible(true);
      setSectorPolygonsVisible(false);
    } else if (selectedSite) {
      flyTo(selectedSite.center, selectedSite.zoom);
      setSectorDataVisible(false);
      setSectorPolygonsVisible(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectorId, loaded]);

  // ── Click handler: click sector polygon on map → drill in ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;

    const handleClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      const feature = e.features?.[0];
      if (feature?.properties?.id) {
        setSelectedSectorId(feature.properties.id);
      }
    };

    map.on('click', 'sectors-fill', handleClick);
    return () => {
      map.off('click', 'sectors-fill', handleClick);
    };
  }, [loaded, mapRef]);

  // ── Callbacks ──
  const handleMissionVisibility = useCallback(
    (visibleIds: number[]) => filterMissions(visibleIds),
    [filterMissions],
  );

  const handleMapLayerToggle = useCallback(
    (layerIds: string[], active: boolean) => setLayerVisibility(layerIds, active),
    [setLayerVisibility],
  );

  const handleOverlayToggle = useCallback(
    (layerIds: string[], visible: boolean) => setLayerVisibility(layerIds, visible),
    [setLayerVisibility],
  );

  return (
    <div className={styles.page}>
      <ReportSidebar
        sites={STUDY_SITES}
        selectedSiteId={selectedSiteId}
        selectedSectorId={selectedSectorId}
        onSiteChange={setSelectedSiteId}
        onSectorChange={setSelectedSectorId}
        sectorDataMap={sectorDataMap}
        siteTotalSeeds={siteSummary?.totalSeeds ?? 0}
        siteTotalMissions={siteSummary?.totalMissions ?? 0}
        data={activeSectorData?.reportData ?? null}
        totalSeeds={activeSectorData?.totalSeeds ?? 0}
        onMissionVisibilityChange={handleMissionVisibility}
        onMapLayerToggle={handleMapLayerToggle}
      />
      <div className={styles.mapArea}>
        <div ref={mapContainer} className={styles.map} />
        {selectedSectorId && (
          <MapOverlay layers={DEFAULT_LAYERS} onToggle={handleOverlayToggle} />
        )}
      </div>
    </div>
  );
}
