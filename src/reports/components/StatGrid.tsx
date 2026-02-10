import styles from './StatGrid.module.css';

export interface Stat {
  value: string;
  label: string;
}

interface StatGridProps {
  stats: Stat[];
}

export default function StatGrid({ stats }: StatGridProps) {
  return (
    <div className={styles.grid}>
      {stats.map((s) => (
        <div key={s.label} className={styles.box}>
          <div className={styles.val}>{s.value}</div>
          <div className={styles.label}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
