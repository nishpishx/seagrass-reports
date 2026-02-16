import { useState, useCallback } from 'react';
import type { Mission, PlantType } from '../types';
import styles from './MissionLegend.module.css';

interface MissionLegendProps {
  missions: Mission[];
  plantType?: PlantType;
  /** Called with array of currently-visible mission IDs */
  onVisibilityChange?: (visibleIds: number[]) => void;
}

export default function MissionLegend({ missions, plantType = 'seeds', onVisibilityChange }: MissionLegendProps) {
  const [visibility, setVisibility] = useState<Record<number, boolean>>(
    () => Object.fromEntries(missions.map((m) => [m.id, true]))
  );

  const toggle = useCallback(
    (id: number) => {
      setVisibility((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        onVisibilityChange?.(
          Object.entries(next)
            .filter(([, v]) => v)
            .map(([k]) => Number(k))
        );
        return next;
      });
    },
    [onVisibilityChange]
  );

  return (
    <div className={styles.legend}>
      {missions.map((m) => (
        <div
          key={m.id}
          className={`${styles.row} ${visibility[m.id] ? '' : styles.dim}`}
          onClick={() => toggle(m.id)}
        >
          <div className={styles.dot} style={{ background: m.color }} />
          <div className={styles.info}>
            <div className={styles.name}>{m.name}</div>
            <div className={styles.meta}>{m.date}</div>
          </div>
          <div className={styles.seeds}>{m.seedCount} {plantType}</div>
        </div>
      ))}
    </div>
  );
}
