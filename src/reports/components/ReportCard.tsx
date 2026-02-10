import React, { useState } from 'react';
import type { ReportSection } from '../types';
import MetricBar from './MetricBar';
import styles from './ReportCard.module.css';

interface ReportCardProps {
  section: ReportSection;
  /** Base animation delay in ms — each metric offsets from this */
  animDelay?: number;
  /** Called when user toggles the "Map" button */
  onMapToggle?: (layerIds: string[], active: boolean) => void;
}

const STATUS_CONFIG: Record<string, { color: string; icon: string }> = {
  pass:    { color: 'var(--rpt-accent)', icon: '✓' },
  warning: { color: 'var(--rpt-warn)',   icon: '!' },
  partial: { color: 'var(--rpt-accent2)', icon: '◐' },
  fail:    { color: 'var(--rpt-fail)',   icon: '✕' },
};

export default function ReportCard({ section, animDelay = 0, onMapToggle }: ReportCardProps) {
  const [open, setOpen] = useState(true);
  const [mapOn, setMapOn] = useState(false);
  const { color, icon } = STATUS_CONFIG[section.status] ?? STATUS_CONFIG.partial;

  const handleMapToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !mapOn;
    setMapOn(next);
    onMapToggle?.(section.mapLayerIds ?? [], next);
  };

  return (
    <div className={styles.card}>
      <button className={styles.head} onClick={() => setOpen(!open)}>
        <span className={styles.statusDot} style={{ background: color }}>{icon}</span>
        <span className={styles.title}>{section.title}</span>

        {section.hasMapLayer && (
          <span
            className={`${styles.mapToggle} ${mapOn ? styles.mapToggleOn : ''}`}
            onClick={handleMapToggle}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
            </svg>
            Map
          </span>
        )}

        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="var(--rpt-text-3)" strokeWidth="2.5" strokeLinecap="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div className={`${styles.body} ${open ? '' : styles.bodyClosed}`}>
        <div className={styles.inner}>
          <p className={styles.desc}>{section.description}</p>
          {section.metrics.map((m, i) => (
            <MetricBar key={m.label} metric={m} delay={animDelay + i * 60} />
          ))}
        </div>
      </div>
    </div>
  );
}
