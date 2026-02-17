import { useRef, useState, useCallback, useEffect } from 'react';
import type { StudySite, Sector } from '../../reports/types';
import { STUDY_SITES, sectorsToGeoJSON } from '../../reports/data/studySites';
import usePlanMap from '../hooks/usePlanMap';
import PlanMissionSidebar from './PlanMissionSidebar';
import styles from './PlanMissionPage.module.css';

interface PlanMissionPageProps {
  mapboxToken: string;
  mapStyle?: string;
}

export default function PlanMissionPage({ mapboxToken, mapStyle }: PlanMissionPageProps) {
  const mapContainer = useRef<HTMLDivElement>(null);

  // ── Study site state (starts with existing sites) ──
  const [sites, setSites] = useState<StudySite[]>(() => [...STUDY_SITES]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

  const selectedSite = sites.find((s) => s.id === selectedSiteId) ?? null;

  // ── Map hook ──
  const {
    loaded,
    flyTo,
    setSectorPolygons,
    setDraftSector,
    onMapClick,
    clearMapClick,
  } = usePlanMap({
    container: mapContainer,
    accessToken: mapboxToken,
    style: mapStyle,
  });

  // ── Effect: site changed → fly to site, show polygons ──
  useEffect(() => {
    if (!loaded) return;
    if (selectedSiteId === '__all__') {
      // Sector polygons with original names
      const sectorFeatures: GeoJSON.Feature[] = sites.flatMap((site) =>
        site.sectors.map((s) => ({
          type: 'Feature' as const,
          properties: { id: s.id, name: s.name, color: s.color },
          geometry: { type: 'Polygon' as const, coordinates: [s.boundary] },
        })),
      );
      // Site-level labels at each site center
      const siteLabels: GeoJSON.Feature[] = sites.map((site) => ({
        type: 'Feature' as const,
        properties: { name: site.name, labelType: 'site' },
        geometry: { type: 'Point' as const, coordinates: site.center },
      }));
      setSectorPolygons({ type: 'FeatureCollection', features: [...sectorFeatures, ...siteLabels] });
    } else if (selectedSite) {
      flyTo(selectedSite.center, selectedSite.zoom);
      setSectorPolygons(sectorsToGeoJSON(selectedSite.sectors));
    } else {
      setSectorPolygons(null);
    }
  }, [selectedSiteId, loaded, selectedSite, sites, flyTo, setSectorPolygons]);

  // ── Effect: sector selected → zoom in ──
  useEffect(() => {
    if (!loaded || !selectedSectorId) return;
    if (selectedSiteId === '__all__') {
      // Find sector across all sites
      for (const site of sites) {
        const sector = site.sectors.find((s) => s.id === selectedSectorId);
        if (sector) {
          flyTo(sector.center, 15);
          return;
        }
      }
    } else if (selectedSite) {
      const sector = selectedSite.sectors.find((s) => s.id === selectedSectorId);
      if (sector) {
        flyTo(sector.center, 15);
      }
    }
  }, [selectedSectorId, loaded, selectedSiteId, selectedSite, sites, flyTo]);

  // ── Callbacks for sidebar ──
  const handleAddSite = useCallback(
    (site: StudySite) => {
      setSites((prev) => [...prev, site]);
      setSelectedSiteId(site.id);
      setSelectedSectorId(null);
    },
    [],
  );

  const handleAddSector = useCallback(
    (sector: Sector) => {
      setSites((prev) =>
        prev.map((s) =>
          s.id === selectedSiteId ? { ...s, sectors: [...s.sectors, sector] } : s,
        ),
      );
      setSelectedSectorId(sector.id);
      // Update polygons with the new sector
      if (selectedSite) {
        setSectorPolygons(sectorsToGeoJSON([...selectedSite.sectors, sector]));
      }
      setDraftSector(null);
    },
    [selectedSiteId, selectedSite, setSectorPolygons, setDraftSector],
  );

  const handleSiteChange = useCallback((id: string | null) => {
    setSelectedSiteId(id);
    setSelectedSectorId(null);
  }, []);

  const handleUpdateDraft = useCallback(
    (boundary: [number, number][] | null) => {
      if (!boundary) {
        setDraftSector(null);
        return;
      }
      setDraftSector({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [boundary] },
          },
        ],
      });
    },
    [setDraftSector],
  );

  return (
    <div className={styles.page}>
      <PlanMissionSidebar
        sites={sites}
        selectedSiteId={selectedSiteId}
        selectedSectorId={selectedSectorId}
        onSiteChange={handleSiteChange}
        onSectorChange={setSelectedSectorId}
        onAddSite={handleAddSite}
        onAddSector={handleAddSector}
        onUpdateDraft={handleUpdateDraft}
        onRequestMapClick={onMapClick}
        onClearMapClick={clearMapClick}
      />
      <div className={styles.mapArea}>
        <div ref={mapContainer} className={styles.map} />
      </div>
    </div>
  );
}
