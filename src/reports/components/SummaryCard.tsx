import styles from './SummaryCard.module.css';

interface SummaryCardProps {
  title: string;
  text: string;
  accentColor?: string;
}

export default function SummaryCard({ title, text, accentColor = 'var(--rpt-accent)' }: SummaryCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.icon}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </div>
      <div>
        <div className={styles.title}>{title}</div>
        <div className={styles.text}>{text}</div>
      </div>
    </div>
  );
}
