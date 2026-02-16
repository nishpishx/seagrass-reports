import { useState, useEffect, useRef } from 'react';
import { LiveFeedSimulation } from '../data/liveFeedSim';
import type { LiveFeedData } from '../types';

const POLL_INTERVAL = 1500;

const EMPTY_FC: GeoJSON.FeatureCollection<GeoJSON.Point> = { type: 'FeatureCollection', features: [] };
const EMPTY_LS: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: [] },
};

const INITIAL_DATA: LiveFeedData = {
  robotPosition: null,
  seedDrops: EMPTY_FC,
  pathTrail: EMPTY_LS,
  stats: { totalSeeds: 0, distanceCovered: 0, elapsedTime: 0, currentSpeed: 0, avgDepth: 0, pathProgress: 0 },
  connectionStatus: 'connecting',
  recentDrops: [],
};

interface UseLiveFeedOptions {
  sectorBoundary: [number, number][];
  enabled: boolean;
}

export default function useLiveFeed({ sectorBoundary, enabled }: UseLiveFeedOptions): LiveFeedData {
  const simRef = useRef<LiveFeedSimulation | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [data, setData] = useState<LiveFeedData>(INITIAL_DATA);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      simRef.current = null;
      setData(INITIAL_DATA);
      return;
    }

    // Create and start simulation
    const sim = new LiveFeedSimulation(sectorBoundary);
    sim.start();
    simRef.current = sim;

    // Brief "connecting" delay
    const connectTimeout = setTimeout(() => {
      setData((prev) => ({ ...prev, connectionStatus: 'connected' }));
    }, 800);

    // Poll loop
    intervalRef.current = window.setInterval(() => {
      const s = simRef.current;
      if (!s) return;
      setData({
        robotPosition: s.getRobotPosition(),
        seedDrops: s.getSeedDrops(),
        pathTrail: s.getPathTrail(),
        stats: s.getStats(),
        connectionStatus: 'connected',
        recentDrops: s.getRecentDrops(10),
      });
    }, POLL_INTERVAL);

    return () => {
      clearTimeout(connectTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      simRef.current = null;
    };
  }, [sectorBoundary, enabled]);

  return data;
}
