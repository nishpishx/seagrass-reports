import React, { useState, useEffect } from 'react';
import type { Metric } from '../types';
import styles from './MetricBar.module.css';

interface MetricBarProps {
  metric: Metric;
  delay?: number;
}

function getColor(value: number, target: number, inverse?: boolean): string {
  const ratio = value / target;
  if (inverse) {
    if (ratio <= 0.5) return 'var(--rpt-accent)';
    if (ratio <= 0.85) return 'var(--rpt-warn)';
    return 'var(--rpt-fail)';
  }
  if (ratio >= 1) return 'var(--rpt-accent)';
  if (ratio >= 0.6) return 'var(--rpt-warn)';
  return 'var(--rpt-fail)';
}

export default function MetricBar({ metric, delay = 0 }: MetricBarProps) {
  const { label, value, target, unit, inverse } = metric;
  const [animated, setAnimated] = useState(false);
  const pct = Math.min((value / target) * 100, 100);
  const color = getColor(value, target, inverse);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const fmtUnit = unit === '%' ? '%' : ` ${unit}`;

  return (
    <div className={styles.metric}>
      <div className={styles.head}>
        <span>{label}</span>
        <span className={styles.val}>
          {value}{fmtUnit}
          <span className={styles.target}>/ {target}{fmtUnit}</span>
        </span>
      </div>
      <div className={styles.track}>
        <div className={styles.targetMark} style={{ left: 'calc(100% - 1px)' }} />
        <div
          className={styles.fill}
          style={{
            width: animated ? `${pct}%` : '0%',
            background: color,
          }}
        />
      </div>
    </div>
  );
}
