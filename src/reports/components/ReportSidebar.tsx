import { useState } from 'react';
import type { ReportData } from '../types';
import ReportCard from './ReportCard';
import MissionLegend from './MissionLegend';
import StatGrid from './StatGrid';
import SummaryCard from './SummaryCard';
import styles from './ReportSidebar.module.css';

interface ReportSidebarProps {
  data: ReportData;
  totalSeeds: number;
  onMissionVisibilityChange?: (visibleIds: number[]) => void;
  onMapLayerToggle?: (layerIds: string[], active: boolean) => void;
}

export default function ReportSidebar({
  data,
  totalSeeds,
  onMissionVisibilityChange,
  onMapLayerToggle,
}: ReportSidebarProps) {
  const [activeTab, setActiveTab] = useState(data.tabs[0]?.key ?? '');

  const currentTab = data.tabs.find((t) => t.key === activeTab);

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
        <h1 className={styles.title}>{data.title}</h1>
        <p className={styles.meta}>{data.subtitle}</p>
      </div>

      {/* ── Tabs ── */}
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

      {/* ── Scrollable Body ── */}
      <div className={styles.body}>
        {/* Show stat grid + summary on overview */}
        {activeTab === 'overview' && (
          <StatGrid
            stats={[
              { value: totalSeeds.toLocaleString(), label: 'Seeds Planted' },
              { value: String(data.missions.length), label: 'Missions' },
              { value: '3.8 km', label: 'Path Length' },
            ]}
          />
        )}

        {/* Show mission legend on missions tab */}
        {activeTab === 'missions' && (
          <>
            <p className={styles.hint}>
              Click a mission to isolate its seed points on the map.
            </p>
            <MissionLegend
              missions={data.missions}
              onVisibilityChange={onMissionVisibilityChange}
            />
          </>
        )}

        {/* Report cards for current tab */}
        {currentTab?.sections.map((section, i) => (
          <ReportCard
            key={`${activeTab}-${section.title}`}
            section={section}
            animDelay={i * 100}
            onMapToggle={onMapLayerToggle}
          />
        ))}

        {/* Summary insight */}
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

        {/* Legend */}
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
      </div>
    </div>
  );
}
