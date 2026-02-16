import type { ConnectionStatus } from '../types';
import styles from './LiveBanner.module.css';

interface LiveBannerProps {
  robotId?: string;
  connectionStatus: ConnectionStatus;
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connecting',
  connected: 'Live',
  degraded: 'Weak Signal',
  disconnected: 'Disconnected',
};

export default function LiveBanner({ robotId = 'ROV-01', connectionStatus }: LiveBannerProps) {
  return (
    <div className={`${styles.banner} ${styles[connectionStatus]}`}>
      <span className={styles.dot} />
      <span className={styles.label}>{STATUS_LABEL[connectionStatus]}</span>
      <span className={styles.robotId}>{robotId}</span>
    </div>
  );
}
