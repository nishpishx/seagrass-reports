import { useState } from 'react';
import { ReportsPage } from './reports';
import { PlanMissionPage } from './plan-mission';
import './reports/styles/tokens.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import styles from './App.module.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

const TABS = [
  { key: 'reports', label: 'Reports' },
  { key: 'fleet', label: 'Fleet' },
  { key: 'plan-mission', label: 'Plan Mission' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function App() {
  const [tab, setTab] = useState<TabKey>('reports');

  if (!MAPBOX_TOKEN) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0b1420',
        color: '#93adc2',
        fontFamily: 'DM Sans, system-ui, sans-serif',
        textAlign: 'center',
        padding: 40,
      }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Missing Mapbox Token
          </p>
          <p style={{ fontSize: 13, color: '#546d82', lineHeight: 1.6 }}>
            Create a <code style={{
              background: '#162336',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 12,
            }}>.env</code> file in your project root with:
          </p>
          <pre style={{
            background: '#162336',
            padding: '12px 16px',
            borderRadius: 8,
            fontSize: 12,
            marginTop: 12,
            textAlign: 'left',
            display: 'inline-block',
          }}>VITE_MAPBOX_TOKEN=pk.eyJ1...</pre>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {/* ── Top navigation ── */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12c2-3 5-6 10-6s8 3 10 6c-2 3-5 6-10 6s-8-3-10-6z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          Reefgen Atlas
        </div>

        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.navBtn} ${tab === t.key ? styles.navActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Tab content ── */}
      <div className={styles.content}>
        {tab === 'reports' && <ReportsPage mapboxToken={MAPBOX_TOKEN} />}
        {tab === 'fleet' && (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 20l3.5-7H11l3.5 7" />
                <path d="M6.5 13L8 6h8l1.5 7" />
                <circle cx="12" cy="20" r="1" />
              </svg>
            </div>
            <div className={styles.placeholderTitle}>Fleet</div>
            <div className={styles.placeholderText}>Coming soon</div>
          </div>
        )}
        {tab === 'plan-mission' && <PlanMissionPage mapboxToken={MAPBOX_TOKEN} />}
      </div>
    </div>
  );
}
