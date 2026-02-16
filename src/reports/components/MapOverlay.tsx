import { useState } from 'react';
import styles from './MapOverlay.module.css';

interface LayerDef {
  key: string;
  label: string;
  layerIds: string[];
}

interface MapOverlayProps {
  layers: LayerDef[];
  onToggle: (layerIds: string[], visible: boolean) => void;
}

export default function MapOverlay({ layers, onToggle }: MapOverlayProps) {
  const [state, setState] = useState<Record<string, boolean>>(
    () => Object.fromEntries(layers.map((l) => [l.key, true]))
  );

  const toggle = (layer: LayerDef) => {
    const next = !state[layer.key];
    setState((s) => ({ ...s, [layer.key]: next }));
    onToggle(layer.layerIds, next);
  };

  return (
    <>
      {/* Layer controls */}
      <div className={styles.controls}>
        <div className={styles.title}>Layers</div>
        {layers.map((l) => (
          <div key={l.key} className={styles.row} onClick={() => toggle(l)}>
            <div className={`${styles.check} ${state[l.key] ? styles.checkOn : ''}`}>
              {state[l.key] ? '✓' : ''}
            </div>
            {l.label}
          </div>
        ))}
      </div>

      {/* Depth legend */}
      <div className={styles.depthLegend}>
        <div className={styles.title}>Depth</div>
        <div className={styles.depthBar} />
        <div className={styles.depthLabels}>
          <span>0m</span><span>5m</span><span>15m</span><span>30m</span>
        </div>
      </div>
    </>
  );
}

export const DEFAULT_LAYERS: LayerDef[] = [
  { key: 'bathymetry', label: 'Bathymetry', layerIds: ['bathymetry-fill'] },
  { key: 'path', label: 'Planting Path', layerIds: ['path-glow', 'path-line'] },
  { key: 'seeds', label: 'Seed Points', layerIds: ['seeds-glow', 'seeds-dot'] },
];

export const LIVE_LAYERS: LayerDef[] = [
  { key: 'robot', label: 'Robot', layerIds: ['robot-pulse', 'robot-dot'] },
  { key: 'live-path', label: 'Actual Path', layerIds: ['live-path-glow', 'live-path-line'] },
  { key: 'path', label: 'Planned Path', layerIds: ['path-glow', 'path-line'] },
  { key: 'seeds', label: 'Seed Drops', layerIds: ['seeds-glow', 'seeds-dot'] },
  { key: 'bathymetry', label: 'Bathymetry', layerIds: ['bathymetry-fill'] },
];
