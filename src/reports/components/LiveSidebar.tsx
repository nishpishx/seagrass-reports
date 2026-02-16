import type { LiveFeedData, Metric, Mission } from '../types';
import LiveBanner from './LiveBanner';
import StatGrid from './StatGrid';
import ReportCard from './ReportCard';
import MissionLegend from './MissionLegend';
import styles from './LiveSidebar.module.css';

interface LiveSidebarProps {
  liveFeed: LiveFeedData;
  /** Completed missions from previous sorties in this sector */
  missions?: Mission[];
  historicalSeeds?: number;
  onMissionVisibilityChange?: (visibleIds: number[]) => void;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

export default function LiveSidebar({ liveFeed, missions, historicalSeeds = 0, onMissionVisibilityChange }: LiveSidebarProps) {
  const { stats, connectionStatus, recentDrops, robotPosition } = liveFeed;
  const telemetry = robotPosition?.properties;

  const progressPct = Math.round(stats.pathProgress * 100);
  const totalAllSeeds = historicalSeeds + stats.totalSeeds;

  const telemetryMetrics: Metric[] = telemetry
    ? [
        { label: 'Depth', value: telemetry.depth as number, target: 25, unit: 'm' },
        { label: 'Speed', value: telemetry.speed as number, target: 1.2, unit: 'm/s' },
        { label: 'Battery', value: telemetry.battery as number, target: 100, unit: '%' },
        { label: 'Signal', value: telemetry.signalStrength as number, target: 100, unit: '%' },
      ]
    : [];

  const plantingMetrics: Metric[] = [
    { label: 'Live Seeds', value: stats.totalSeeds, target: 500, unit: 'seeds' },
    { label: 'Avg Depth', value: Math.round(stats.avgDepth * 10) / 10, target: 10, unit: 'm' },
    {
      label: 'Drop Rate',
      value: stats.elapsedTime > 0 ? Math.round((stats.totalSeeds / (stats.elapsedTime / 60000)) * 10) / 10 : 0,
      target: 4,
      unit: '/min',
    },
  ];

  return (
    <div className={styles.content}>
      <LiveBanner connectionStatus={connectionStatus} />

      <StatGrid
        stats={[
          { value: totalAllSeeds.toLocaleString(), label: 'Total Seeds' },
          { value: String(stats.totalSeeds), label: 'Live Drops' },
          { value: formatElapsed(stats.elapsedTime), label: 'Elapsed' },
        ]}
      />

      {/* Mission Progress */}
      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <span className={styles.progressLabel}>Mission Progress</span>
          <span className={styles.progressValue}>{progressPct}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Telemetry */}
      {telemetry && (
        <ReportCard
          section={{
            title: 'Robot Telemetry',
            description: `Heading: ${telemetry.heading}\u00b0 · Depth: ${telemetry.depth}m`,
            status: (telemetry.battery as number) > 30 ? 'pass' : (telemetry.battery as number) > 15 ? 'warning' : 'fail',
            metrics: telemetryMetrics,
          }}
          animDelay={0}
        />
      )}

      {/* Planting Metrics */}
      <ReportCard
        section={{
          title: 'Planting Metrics',
          description: 'Real-time planting performance during this mission.',
          status: stats.totalSeeds > 100 ? 'pass' : 'warning',
          metrics: plantingMetrics,
        }}
        animDelay={100}
      />

      {/* Completed Missions */}
      {missions && missions.length > 0 && (
        <div className={styles.missionsCard}>
          <div className={styles.missionsTitle}>Completed Missions</div>
          <div className={styles.missionsSubtitle}>
            {missions.length} missions · {historicalSeeds.toLocaleString()} seeds
          </div>
          <MissionLegend
            missions={missions}
            onVisibilityChange={onMissionVisibilityChange}
          />
        </div>
      )}

      {/* Recent Drops */}
      <div className={styles.recentCard}>
        <div className={styles.recentTitle}>Recent Drops</div>
        <div className={styles.recentList}>
          {recentDrops.map((drop) => (
            <div key={drop.id} className={styles.dropRow}>
              <span className={styles.dropDot} />
              <span className={styles.dropDepth}>{drop.depth}m</span>
              <span className={styles.dropTime}>
                {new Date(drop.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          ))}
          {recentDrops.length === 0 && (
            <div className={styles.dropEmpty}>Waiting for first seed drop</div>
          )}
        </div>
      </div>
    </div>
  );
}
