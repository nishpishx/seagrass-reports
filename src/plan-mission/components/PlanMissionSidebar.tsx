import { useState, useEffect, useCallback } from 'react';
import type { StudySite, Sector } from '../../reports/types';
import { computeRectBoundary } from '../geo';
import styles from './PlanMissionSidebar.module.css';

type SectorType = 'rectangle' | 'polygon';

const SECTOR_COLORS = ['#34d399', '#38bdf8', '#fbbf24', '#c084fc', '#f472b6', '#fb923c', '#a3e635'];

interface PlanMissionSidebarProps {
  sites: StudySite[];
  selectedSiteId: string | null;
  selectedSectorId: string | null;
  onSiteChange: (id: string | null) => void;
  onSectorChange: (id: string | null) => void;
  onAddSite: (site: StudySite) => void;
  onAddSector: (sector: Sector) => void;
  onUpdateDraft: (boundary: [number, number][] | null) => void;
  onRequestMapClick: (cb: (lngLat: [number, number]) => void) => void;
  onClearMapClick: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function PlanMissionSidebar({
  sites,
  selectedSiteId,
  selectedSectorId,
  onSiteChange,
  onSectorChange,
  onAddSite,
  onAddSector,
  onUpdateDraft,
  onRequestMapClick,
  onClearMapClick,
}: PlanMissionSidebarProps) {
  // ── Site / sector selection ──
  const [showNewSite, setShowNewSite] = useState(false);
  const [showNewSector, setShowNewSector] = useState(false);
  const [sectorType, setSectorType] = useState<SectorType>('rectangle');

  // ── New site fields ──
  const [siteName, setSiteName] = useState('');
  const [siteRegion, setSiteRegion] = useState('');
  const [siteLat, setSiteLat] = useState('');
  const [siteLng, setSiteLng] = useState('');

  // ── New sector fields ──
  const [sectorName, setSectorName] = useState('');
  const [rectAngle, setRectAngle] = useState('0');
  const [rectLength, setRectLength] = useState('500');
  const [rectWidth, setRectWidth] = useState('250');
  const [draftCenter, setDraftCenter] = useState<[number, number] | null>(null);

  // Path settings (kept as-is for future wiring)
  const [pathWidth, setPathWidth] = useState('');
  const [pathLength, setPathLength] = useState('');
  const [pathAngle, setPathAngle] = useState('');
  const [rowSpacing, setRowSpacing] = useState('');
  const [plantSpacing, setPlantSpacing] = useState('');
  const [pathGenerated, setPathGenerated] = useState(false);

  const selectedSite = sites.find((s) => s.id === selectedSiteId) ?? null;
  const hasSite = selectedSiteId !== null;

  // ── Update draft preview when rectangle params change ──
  useEffect(() => {
    if (!draftCenter) return;
    const angle = parseFloat(rectAngle) || 0;
    const length = parseFloat(rectLength) || 100;
    const width = parseFloat(rectWidth) || 50;
    const boundary = computeRectBoundary(draftCenter, angle, length, width);
    onUpdateDraft(boundary);
  }, [draftCenter, rectAngle, rectLength, rectWidth, onUpdateDraft]);

  // ── Site dropdown handler ──
  const handleSiteSelect = useCallback(
    (value: string) => {
      if (value === '__add_new__') {
        setShowNewSite(true);
        onSiteChange(null);
      } else {
        setShowNewSite(false);
        onSiteChange(value || null);
      }
      setShowNewSector(false);
      setDraftCenter(null);
      onUpdateDraft(null);
    },
    [onSiteChange, onUpdateDraft],
  );

  // ── Sector dropdown handler ──
  const handleSectorSelect = useCallback(
    (value: string) => {
      if (value === '__add_new__') {
        setShowNewSector(true);
        onSectorChange(null);
      } else {
        setShowNewSector(false);
        setDraftCenter(null);
        onUpdateDraft(null);
        onSectorChange(value || null);
      }
    },
    [onSectorChange, onUpdateDraft],
  );

  // ── Create site ──
  const handleCreateSite = useCallback(() => {
    const name = siteName.trim();
    if (!name) return;
    const lat = parseFloat(siteLat);
    const lng = parseFloat(siteLng);
    if (isNaN(lat) || isNaN(lng)) return;

    const site: StudySite = {
      id: slugify(name) || `site-${Date.now()}`,
      name,
      region: siteRegion.trim() || 'Unknown',
      center: [lng, lat],
      zoom: 13,
      plantType: 'seeds',
      sectors: [],
    };

    onAddSite(site);
    setShowNewSite(false);
    setSiteName('');
    setSiteRegion('');
    setSiteLat('');
    setSiteLng('');
  }, [siteName, siteRegion, siteLat, siteLng, onAddSite]);

  // ── Pick site location on map ──
  const handlePickSiteLocation = useCallback(() => {
    onRequestMapClick(([lng, lat]) => {
      setSiteLng(lng.toFixed(6));
      setSiteLat(lat.toFixed(6));
    });
  }, [onRequestMapClick]);

  // ── Draw Rectangle (click map to place center) ──
  const handleDrawRectangle = useCallback(() => {
    onRequestMapClick((lngLat) => {
      setDraftCenter(lngLat);
    });
  }, [onRequestMapClick]);

  // ── Save sector ──
  const handleSaveSector = useCallback(() => {
    if (!draftCenter || !selectedSiteId) return;

    const name = sectorName.trim() || `Sector ${(selectedSite?.sectors.length ?? 0) + 1}`;
    const angle = parseFloat(rectAngle) || 0;
    const length = parseFloat(rectLength) || 100;
    const width = parseFloat(rectWidth) || 50;
    const boundary = computeRectBoundary(draftCenter, angle, length, width);
    const colorIdx = (selectedSite?.sectors.length ?? 0) % SECTOR_COLORS.length;

    const sector: Sector = {
      id: `${selectedSiteId}-${slugify(name) || Date.now()}`,
      name,
      center: draftCenter,
      boundary,
      color: SECTOR_COLORS[colorIdx],
      status: 'planned',
    };

    onAddSector(sector);
    setShowNewSector(false);
    setDraftCenter(null);
    setSectorName('');
    setRectAngle('0');
    setRectLength('500');
    setRectWidth('250');
  }, [draftCenter, selectedSiteId, selectedSite, sectorName, rectAngle, rectLength, rectWidth, onAddSector]);

  // ── Clear draft ──
  const handleClearDraft = useCallback(() => {
    setDraftCenter(null);
    onUpdateDraft(null);
    onClearMapClick();
  }, [onUpdateDraft, onClearMapClick]);

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
            placeholder="Search for a place"
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
            value={showNewSite ? '__add_new__' : selectedSiteId ?? ''}
            onChange={(e) => handleSiteSelect(e.target.value)}
          >
            <option value="">Select a study site</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.region}
              </option>
            ))}
            <option value="__add_new__">+ Add New Site</option>
          </select>

          {/* ── New Site panel ── */}
          {showNewSite && (
            <div className={styles.sitePanel}>
              <div className={styles.inputGrid}>
                <div>
                  <label className={styles.fieldLabel}>Name</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="e.g. Coral Bay"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>Region</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="e.g. Fiji"
                    value={siteRegion}
                    onChange={(e) => setSiteRegion(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.inputGrid} style={{ marginTop: 8 }}>
                <div>
                  <label className={styles.fieldLabel}>Latitude</label>
                  <input
                    className={styles.input}
                    type="number"
                    step="any"
                    placeholder="-17.76"
                    value={siteLat}
                    onChange={(e) => setSiteLat(e.target.value)}
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>Longitude</label>
                  <input
                    className={styles.input}
                    type="number"
                    step="any"
                    placeholder="177.01"
                    value={siteLng}
                    onChange={(e) => setSiteLng(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.btnRow}>
                <button className={styles.btnSecondary} onClick={handlePickSiteLocation}>
                  Pick on Map
                </button>
                <button
                  className={styles.btnSuccess}
                  disabled={!siteName.trim() || !siteLat || !siteLng}
                  onClick={handleCreateSite}
                >
                  Create Site
                </button>
              </div>
            </div>
          )}

          <label className={styles.fieldLabel}>Sector</label>
          <select
            className={styles.select}
            value={showNewSector ? '__add_new__' : selectedSectorId ?? ''}
            disabled={!hasSite}
            onChange={(e) => handleSectorSelect(e.target.value)}
          >
            <option value="">Select a sector</option>
            {selectedSite?.sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="__add_new__">+ Add New Sector</option>
          </select>

          {/* ── New Sector panel ── */}
          {showNewSector && (
            <div className={styles.sectorPanel}>
              <label className={styles.fieldLabel}>Sector Name</label>
              <input
                className={styles.input}
                type="text"
                placeholder={`Sector ${(selectedSite?.sectors.length ?? 0) + 1}`}
                value={sectorName}
                onChange={(e) => setSectorName(e.target.value)}
              />

              <label className={styles.fieldLabel} style={{ marginTop: 12 }}>Sector Type</label>
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
                      <label className={styles.fieldLabel}>Angle (\u00b0)</label>
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
                    <button
                      className={styles.btnPrimary}
                      onClick={handleDrawRectangle}
                    >
                      {draftCenter ? 'Reposition' : 'Draw Rectangle'}
                    </button>
                  </div>
                  {draftCenter && (
                    <div className={styles.draftInfo}>
                      Center: {draftCenter[1].toFixed(5)}, {draftCenter[0].toFixed(5)}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.btnRow} style={{ marginTop: 12 }}>
                  <button className={styles.btnPrimary}>Draw Polygon</button>
                </div>
              )}

              <div className={styles.btnRow}>
                <button className={styles.btnDanger} onClick={handleClearDraft}>
                  Clear Draft
                </button>
                <button
                  className={styles.btnSuccess}
                  disabled={!draftCenter}
                  onClick={handleSaveSector}
                >
                  Save Sector
                </button>
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
              <input className={styles.input} type="number" placeholder="\u2014" value={pathWidth} onChange={(e) => setPathWidth(e.target.value)} />
            </div>
            <div>
              <label className={styles.fieldLabel}>Length (m)</label>
              <input className={styles.input} type="number" placeholder="\u2014" value={pathLength} onChange={(e) => setPathLength(e.target.value)} />
            </div>
          </div>

          <div className={styles.inputGrid} style={{ marginTop: 8 }}>
            <div>
              <label className={styles.fieldLabel}>Angle (\u00b0)</label>
              <input className={styles.input} type="number" placeholder="\u2014" value={pathAngle} onChange={(e) => setPathAngle(e.target.value)} />
            </div>
            <div>
              <label className={styles.fieldLabel}>Row Spacing (m)</label>
              <input className={styles.input} type="number" placeholder="\u2014" step="any" value={rowSpacing} onChange={(e) => setRowSpacing(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <label className={styles.fieldLabel}>Plant Spacing (m)</label>
            <input className={styles.input} type="number" placeholder="\u2014" step="any" value={plantSpacing} onChange={(e) => setPlantSpacing(e.target.value)} />
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
