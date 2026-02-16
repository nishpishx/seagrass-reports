import { useState, useEffect } from 'react';
import type { ReportData, StudySite, SectorData, LiveFeedData } from '../types';
import SiteSelector from './SiteSelector';
import SiteSummary from './SiteSummary';
import ReportCard from './ReportCard';
import MissionLegend from './MissionLegend';
import StatGrid from './StatGrid';
import SummaryCard from './SummaryCard';
import LiveSidebar from './LiveSidebar';
import styles from './ReportSidebar.module.css';

interface ReportSidebarProps {
  sites: StudySite[];
  selectedSiteId: string | null;
  selectedSectorId: string | null;
  onSiteChange: (siteId: string | null) => void;
  onSectorChange: (sectorId: string | null) => void;
  sectorDataMap: Map<string, SectorData>;
  siteTotalSeeds: number;
  siteTotalMissions: number;
  /** Active sector's report data (null when in site overview) */
  data: ReportData | null;
  totalSeeds: number;
  onMissionVisibilityChange?: (visibleIds: number[]) => void;
  onMapLayerToggle?: (layerIds: string[], active: boolean) => void;
  /** Live feed data — when set, renders the live mission view instead of static report */
  liveFeed?: LiveFeedData | null;
  sectorName?: string;
}

export default function ReportSidebar({
  sites,
  selectedSiteId,
  selectedSectorId,
  onSiteChange,
  onSectorChange,
  sectorDataMap,
  siteTotalSeeds,
  siteTotalMissions,
  data,
  totalSeeds,
  onMissionVisibilityChange,
  onMapLayerToggle,
  liveFeed,
  sectorName,
}: ReportSidebarProps) {
  const [activeTab, setActiveTab] = useState(data?.tabs[0]?.key ?? '');
  const selectedSite = sites.find((s) => s.id === selectedSiteId) ?? null;
  const isSiteView = !selectedSectorId;

  // Reset tab when sector changes
  useEffect(() => {
    if (data?.tabs[0]) setActiveTab(data.tabs[0].key);
  }, [selectedSectorId, data]);

  const currentTab = data?.tabs.find((t) => t.key === activeTab);

  return (
    <div className={styles.sidebar}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.label}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Report
        </div>
        <h1 className={styles.title}>
          {liveFeed ? `${sectorName} — Live Mission` : data?.title ?? selectedSite?.name ?? 'Select a Site'}
        </h1>
        <p className={styles.meta}>
          {data?.subtitle ?? (selectedSite ? `${selectedSite.region} · ${selectedSite.sectors.length} sectors` : 'Choose a study site to view reports')}
        </p>
      </div>

      {/* ── Site / Sector selector ── */}
      <SiteSelector
        sites={sites}
        selectedSiteId={selectedSiteId}
        selectedSectorId={selectedSectorId}
        onSiteChange={onSiteChange}
        onSectorChange={onSectorChange}
      />

      {/* ── Tabs (only in sector view, not live mode) ── */}
      {!isSiteView && data && !liveFeed && (
        <div className={styles.tabs}>
          {data.tabs.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.tabBtn} ${tab.key === activeTab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Scrollable Body ── */}
      <div className={styles.body}>
        {/* ── Site overview ── */}
        {isSiteView && selectedSite && (
          <SiteSummary
            site={selectedSite}
            sectorDataMap={sectorDataMap}
            totalSeeds={siteTotalSeeds}
            totalMissions={siteTotalMissions}
            onSectorClick={(id) => onSectorChange(id)}
          />
        )}

        {/* ── No site selected ── */}
        {!selectedSiteId && (
          <SummaryCard
            title="No site selected"
            text="Select a study site from the dropdown above to view its sectors and reports."
          />
        )}

        {/* ── Live mission view (active sectors) ── */}
        {!isSiteView && liveFeed && (
          <LiveSidebar
            liveFeed={liveFeed}
            missions={data?.missions}
            historicalSeeds={totalSeeds}
            onMissionVisibilityChange={onMissionVisibilityChange}
          />
        )}

        {/* ── Sector detail ── */}
        {!isSiteView && !liveFeed && data && (
          <>
            {activeTab === 'overview' && (
              <StatGrid
                stats={[
                  { value: totalSeeds.toLocaleString(), label: selectedSite?.plantType === 'shoots' ? 'Shoots Planted' : 'Seeds Planted' },
                  { value: String(data.missions.length), label: 'Missions' },
                  { value: '3.8 km', label: 'Path Length' },
                ]}
              />
            )}

            {activeTab === 'missions' && (
              <>
                <p className={styles.hint}>
                  Click a mission to isolate its seed points on the map.
                </p>
                <MissionLegend
                  missions={data.missions}
                  plantType={selectedSite?.plantType}
                  onVisibilityChange={onMissionVisibilityChange}
                />
              </>
            )}

            {currentTab?.sections.map((section, i) => (
              <ReportCard
                key={`${activeTab}-${section.title}`}
                section={section}
                animDelay={i * 100}
                onMapToggle={onMapLayerToggle}
              />
            ))}

            {activeTab === 'overview' && (
              <SummaryCard
                title="5 of 8 metrics on track"
                text="Deep planting zones (12–20m) are under-represented. Consider extending future missions into deeper areas along the southern shelf edge."
              />
            )}

            {activeTab === 'bathymetry' && (
              <SummaryCard
                title="Bathymetry Integration"
                text="Depths sourced from multibeam sonar survey (Jan 2026). Grid resolution: 3m. Seed depth estimated from GPS interpolated against the DEM."
                accentColor="var(--rpt-accent2)"
              />
            )}

            {activeTab !== 'missions' && (
              <div className={styles.legendRow}>
                <span className={styles.legendItem}>
                  <span className={styles.legendSwatch} style={{ background: 'var(--rpt-accent)' }} />
                  Meets target
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendSwatch} style={{ background: 'var(--rpt-warn)' }} />
                  Near target
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendSwatch} style={{ background: 'var(--rpt-fail)' }} />
                  Below target
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
