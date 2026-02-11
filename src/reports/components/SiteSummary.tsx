import type { StudySite, SectorData } from '../types';
import StatGrid from './StatGrid';
import SummaryCard from './SummaryCard';
import styles from './SiteSummary.module.css';

interface SiteSummaryProps {
  site: StudySite;
  sectorDataMap: Map<string, SectorData>;
  totalSeeds: number;
  totalMissions: number;
  onSectorClick: (sectorId: string) => void;
}

export default function SiteSummary({
  site,
  sectorDataMap,
  totalSeeds,
  totalMissions,
  onSectorClick,
}: SiteSummaryProps) {
  return (
    <>
      <StatGrid
        stats={[
          { value: totalSeeds.toLocaleString(), label: 'Total Seeds' },
          { value: String(site.sectors.length), label: 'Sectors' },
          { value: String(totalMissions), label: 'Missions' },
        ]}
      />

      <div className={styles.heading}>Sectors</div>

      {site.sectors.map((sec) => {
        const data = sectorDataMap.get(sec.id);
        return (
          <div
            key={sec.id}
            className={styles.sectorCard}
            onClick={() => onSectorClick(sec.id)}
          >
            <div className={styles.sectorDot} style={{ background: sec.color }} />
            <div className={styles.sectorInfo}>
              <div className={styles.sectorName}>{sec.name}</div>
              <div className={styles.sectorMeta}>
                {data ? `${data.totalSeeds.toLocaleString()} seeds · ${data.reportData.missions.length} missions` : 'Loading…'}
              </div>
            </div>
            <svg className={styles.sectorArrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        );
      })}

      <SummaryCard
        title={`${site.sectors.length} sectors active`}
        text={`${site.name} (${site.region}) has ${totalSeeds.toLocaleString()} seeds planted across ${site.sectors.length} sectors. Select a sector to view its detailed report.`}
      />
    </>
  );
}
