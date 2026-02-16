import { useMemo } from 'react';
import type { StudySite, SectorData, Sector, SectorStatus } from '../types';
import StatGrid from './StatGrid';
import SummaryCard from './SummaryCard';
import styles from './SiteSummary.module.css';

const STATUS_GROUPS: { key: SectorStatus; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'planned', label: 'Planned' },
  { key: 'executed', label: 'Executed' },
];

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
  const grouped = useMemo(() => {
    const map = new Map<SectorStatus, Sector[]>();
    for (const sec of site.sectors) {
      const list = map.get(sec.status) ?? [];
      list.push(sec);
      map.set(sec.status, list);
    }
    return map;
  }, [site.sectors]);

  return (
    <>
      <StatGrid
        stats={[
          { value: totalSeeds.toLocaleString(), label: site.plantType === 'shoots' ? 'Total Shoots' : 'Total Seeds' },
          { value: String(site.sectors.length), label: 'Sectors' },
          { value: String(totalMissions), label: 'Missions' },
        ]}
      />

      {STATUS_GROUPS.map(({ key, label }) => {
        const sectors = grouped.get(key);
        if (!sectors?.length) return null;
        return (
          <div key={key}>
            <div className={`${styles.heading} ${styles[`heading_${key}`]}`}>
              <span className={`${styles.statusDot} ${styles[`dot_${key}`]}`} />
              {label}
              <span className={styles.statusCount}>{sectors.length}</span>
            </div>
            {sectors.map((sec) => {
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
                      {data ? `${data.totalSeeds.toLocaleString()} ${site.plantType} · ${data.reportData.missions.length} missions` : 'Loading…'}
                    </div>
                  </div>
                  <svg className={styles.sectorArrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              );
            })}
          </div>
        );
      })}

      <SummaryCard
        title={`${site.sectors.length} sectors across ${STATUS_GROUPS.filter(g => grouped.has(g.key)).length} stages`}
        text={`${site.name} (${site.region}) has ${totalSeeds.toLocaleString()} ${site.plantType} planted across ${site.sectors.length} sectors. Select a sector to view its detailed report.`}
      />
    </>
  );
}
