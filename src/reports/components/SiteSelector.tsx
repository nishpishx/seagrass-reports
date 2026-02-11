import type { StudySite } from '../types';
import styles from './SiteSelector.module.css';

interface SiteSelectorProps {
  sites: StudySite[];
  selectedSiteId: string | null;
  selectedSectorId: string | null;
  onSiteChange: (siteId: string | null) => void;
  onSectorChange: (sectorId: string | null) => void;
}

export default function SiteSelector({
  sites,
  selectedSiteId,
  selectedSectorId,
  onSiteChange,
  onSectorChange,
}: SiteSelectorProps) {
  const selectedSite = sites.find((s) => s.id === selectedSiteId) ?? null;

  return (
    <div className={styles.wrapper}>
      <label className={styles.fieldLabel}>Study Site</label>
      <select
        className={styles.select}
        value={selectedSiteId ?? ''}
        onChange={(e) => {
          const id = e.target.value || null;
          onSiteChange(id);
          onSectorChange(null);
        }}
      >
        <option value="">Select a study site…</option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} — {s.region}
          </option>
        ))}
      </select>

      <label className={styles.fieldLabel} style={{ marginTop: 10 }}>Sector</label>
      <select
        className={styles.select}
        value={selectedSectorId ?? ''}
        disabled={!selectedSite}
        onChange={(e) => onSectorChange(e.target.value || null)}
      >
        <option value="">All Sectors (Overview)</option>
        {selectedSite?.sectors.map((sec) => (
          <option key={sec.id} value={sec.id}>
            {sec.name}
          </option>
        ))}
      </select>

      {selectedSectorId && (
        <button className={styles.backBtn} onClick={() => onSectorChange(null)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to site overview
        </button>
      )}
    </div>
  );
}
