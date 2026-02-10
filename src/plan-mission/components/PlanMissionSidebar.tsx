import { useState } from 'react';
import styles from './PlanMissionSidebar.module.css';

type SectorType = 'rectangle' | 'polygon';

export default function PlanMissionSidebar() {
  const [studySite, setStudySite] = useState('');
  const [sector, setSector] = useState('');
  const [showNewSector, setShowNewSector] = useState(false);
  const [sectorType, setSectorType] = useState<SectorType>('rectangle');

  // Path settings
  const [pathWidth, setPathWidth] = useState('');
  const [pathLength, setPathLength] = useState('');
  const [pathAngle, setPathAngle] = useState('');
  const [rowSpacing, setRowSpacing] = useState('');
  const [plantSpacing, setPlantSpacing] = useState('');
  const [pathGenerated, setPathGenerated] = useState(false);

  // Sector rectangle settings
  const [rectAngle, setRectAngle] = useState('0');
  const [rectLength, setRectLength] = useState('100');
  const [rectWidth, setRectWidth] = useState('50');

  const hasSite = studySite !== '' && studySite !== '__add_new__';

  return (
    <div className={styles.sidebar}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.label}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Mission Planner
        </div>
        <h1 className={styles.title}>Plan Mission</h1>
        <p className={styles.meta}>Configure study area, sectors and planting paths</p>
      </div>

      {/* ── Scrollable Body ── */}
      <div className={styles.body}>
        {/* ── Go to Location ── */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <div className={styles.cardIcon} style={{ background: 'rgba(56,189,248,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--rpt-accent2)" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M16 16l4.5 4.5" strokeLinecap="round" />
              </svg>
            </div>
            Go to Location
          </div>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search for a place…"
          />
        </div>

        {/* ── Study Area ── */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <div className={styles.cardIcon} style={{ background: 'rgba(52,211,153,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--rpt-accent)" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            Study Area
          </div>

          <label className={styles.fieldLabel}>Study Site</label>
          <select
            className={styles.select}
            value={studySite}
            onChange={(e) => setStudySite(e.target.value)}
          >
            <option value="">Select a study site…</option>
            <option value="__add_new__">+ Add New Site…</option>
          </select>

          <label className={styles.fieldLabel}>Sector</label>
          <select
            className={styles.select}
            value={sector}
            disabled={!hasSite}
            onChange={(e) => {
              setSector(e.target.value);
              setShowNewSector(e.target.value === '__add_new__');
            }}
          >
            <option value="">Select a sector…</option>
            <option value="__add_new__">+ Add New Sector…</option>
          </select>

          {/* ── New Sector panel ── */}
          {showNewSector && (
            <div className={styles.sectorPanel}>
              <label className={styles.fieldLabel}>Sector Type</label>
              <div className={styles.typeToggle}>
                <button
                  className={`${styles.typeBtn} ${sectorType === 'rectangle' ? styles.typeBtnActive : ''}`}
                  onClick={() => setSectorType('rectangle')}
                >
                  Rectangle
                </button>
                <button
                  className={`${styles.typeBtn} ${sectorType === 'polygon' ? styles.typeBtnActive : ''}`}
                  onClick={() => setSectorType('polygon')}
                >
                  Polygon
                </button>
              </div>

              {sectorType === 'rectangle' ? (
                <>
                  <div className={styles.inputGrid} style={{ marginTop: 12 }}>
                    <div>
                      <label className={styles.fieldLabel}>Angle (°)</label>
                      <input className={styles.input} type="number" value={rectAngle} onChange={(e) => setRectAngle(e.target.value)} />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Length (m)</label>
                      <input className={styles.input} type="number" value={rectLength} onChange={(e) => setRectLength(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label className={styles.fieldLabel}>Width (m)</label>
                    <input className={styles.input} type="number" value={rectWidth} onChange={(e) => setRectWidth(e.target.value)} />
                  </div>
                  <div className={styles.btnRow}>
                    <button className={styles.btnPrimary}>Draw Rectangle</button>
                  </div>
                </>
              ) : (
                <div className={styles.btnRow} style={{ marginTop: 12 }}>
                  <button className={styles.btnPrimary}>Draw Polygon</button>
                </div>
              )}

              <div className={styles.btnRow}>
                <button className={styles.btnDanger}>Clear Draft</button>
                <button className={styles.btnSuccess}>Save Sector</button>
              </div>
            </div>
          )}

          <div className={styles.btnRow}>
            <button className={styles.btnSecondary} disabled={!hasSite}>
              Clear Sector(s)
            </button>
          </div>
        </div>

        {/* ── Path Settings ── */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <div className={styles.cardIcon} style={{ background: 'rgba(251,191,36,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--rpt-warn)" strokeWidth="2" strokeLinecap="round">
                <path d="M4 19l4-4m0 0l4 4m-4-4V5" />
                <path d="M20 5l-4 4m0 0l-4-4m4 4v10" />
              </svg>
            </div>
            Path Settings
          </div>

          <div className={styles.inputGrid}>
            <div>
              <label className={styles.fieldLabel}>Width (m)</label>
              <input className={styles.input} type="number" placeholder="—" value={pathWidth} onChange={(e) => setPathWidth(e.target.value)} />
            </div>
            <div>
              <label className={styles.fieldLabel}>Length (m)</label>
              <input className={styles.input} type="number" placeholder="—" value={pathLength} onChange={(e) => setPathLength(e.target.value)} />
            </div>
          </div>

          <div className={styles.inputGrid} style={{ marginTop: 8 }}>
            <div>
              <label className={styles.fieldLabel}>Angle (°)</label>
              <input className={styles.input} type="number" placeholder="—" value={pathAngle} onChange={(e) => setPathAngle(e.target.value)} />
            </div>
            <div>
              <label className={styles.fieldLabel}>Row Spacing (m)</label>
              <input className={styles.input} type="number" placeholder="—" step="any" value={rowSpacing} onChange={(e) => setRowSpacing(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <label className={styles.fieldLabel}>Plant Spacing (m)</label>
            <input className={styles.input} type="number" placeholder="—" step="any" value={plantSpacing} onChange={(e) => setPlantSpacing(e.target.value)} />
          </div>

          <div className={styles.btnRow}>
            <button className={styles.btnPrimary} onClick={() => setPathGenerated(true)}>
              Generate Path
            </button>
          </div>

          <div className={styles.btnRow}>
            <button className={styles.btnSecondary} disabled={!pathGenerated}>
              Reverse Path
            </button>
            <button className={styles.btnDanger} disabled={!pathGenerated} onClick={() => setPathGenerated(false)}>
              Clear Path
            </button>
          </div>

          <div className={styles.divider} />

          <div className={styles.btnRow}>
            <button className={styles.btnSuccess} disabled={!pathGenerated}>
              Save Path
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
