import type { LiveFeedStats, LiveSeedDrop } from '../types';
import { generatePath } from './sampleData';

// Simulation config — these would become API endpoint URLs in production
const ROBOT_SPEED = 0.8;                       // meters per second
const SEED_INTERVAL_METERS = 15;               // drop a seed every N meters
const MISSION_DURATION_MS = 60 * 60 * 1000;    // 60 min simulated mission
const DEG_TO_M = 111_320;                      // rough meters per degree at equator

export class LiveFeedSimulation {
  private path: [number, number][];
  private pathLengths: number[];
  private totalPathLength: number;
  private startTime = 0;
  private seeds: LiveSeedDrop[] = [];
  private lastSeedDistance = 0;
  private _started = false;
  readonly missionId: number;

  constructor(sectorBoundary: [number, number][], liveMissionId = 4) {
    this.missionId = liveMissionId;
    this.path = generatePath(sectorBoundary);

    // Pre-compute cumulative path lengths in meters
    this.pathLengths = [0];
    for (let i = 1; i < this.path.length; i++) {
      const [lng1, lat1] = this.path[i - 1];
      const [lng2, lat2] = this.path[i];
      const dlng = (lng2 - lng1) * DEG_TO_M * Math.cos((lat1 * Math.PI) / 180);
      const dlat = (lat2 - lat1) * DEG_TO_M;
      this.pathLengths.push(this.pathLengths[i - 1] + Math.sqrt(dlng * dlng + dlat * dlat));
    }
    this.totalPathLength = this.pathLengths[this.pathLengths.length - 1];
  }

  start(): void {
    this.startTime = Date.now();
    this._started = true;
    this.seeds = [];
    this.lastSeedDistance = 0;
  }

  get started(): boolean { return this._started; }
  get plannedPath(): [number, number][] { return this.path; }

  /** Interpolate position & heading at a given distance (meters) along the path */
  private positionAtDistance(d: number): { lng: number; lat: number; heading: number } {
    const clamped = Math.max(0, Math.min(d, this.totalPathLength));
    for (let i = 1; i < this.pathLengths.length; i++) {
      if (this.pathLengths[i] >= clamped) {
        const segStart = this.pathLengths[i - 1];
        const segLen = this.pathLengths[i] - segStart;
        const t = segLen > 0 ? (clamped - segStart) / segLen : 0;
        const lng = this.path[i - 1][0] + t * (this.path[i][0] - this.path[i - 1][0]);
        const lat = this.path[i - 1][1] + t * (this.path[i][1] - this.path[i - 1][1]);
        const heading = (Math.atan2(
          this.path[i][0] - this.path[i - 1][0],
          this.path[i][1] - this.path[i - 1][1],
        ) * 180 / Math.PI + 360) % 360;
        return { lng, lat, heading };
      }
    }
    const last = this.path[this.path.length - 1];
    return { lng: last[0], lat: last[1], heading: 0 };
  }

  private getCurrentDistance(): number {
    return ((Date.now() - this.startTime) / 1000) * ROBOT_SPEED;
  }

  /** Simulated endpoint: GET /robot/position */
  getRobotPosition(): GeoJSON.Feature<GeoJSON.Point> {
    const distance = this.getCurrentDistance();
    const { lng, lat, heading } = this.positionAtDistance(distance);
    const elapsed = Date.now() - this.startTime;
    const battery = Math.max(0, 100 - (elapsed / MISSION_DURATION_MS) * 100);
    const speed = ROBOT_SPEED + (Math.random() - 0.5) * 0.2;
    const depth = 3 + Math.sin(distance / 200) * 4 + (Math.random() - 0.5) * 1;
    const signal = Math.max(40, 95 - (distance / this.totalPathLength) * 30 + (Math.random() - 0.5) * 10);

    return {
      type: 'Feature',
      properties: {
        depth: Math.round(depth * 10) / 10,
        speed: Math.round(speed * 100) / 100,
        heading: Math.round(heading),
        battery: Math.round(battery * 10) / 10,
        signalStrength: Math.round(signal),
        timestamp: Date.now(),
      },
      geometry: { type: 'Point', coordinates: [lng, lat] },
    };
  }

  /** Simulated endpoint: GET /mission/seeds */
  getSeedDrops(): GeoJSON.FeatureCollection<GeoJSON.Point> {
    const distance = this.getCurrentDistance();

    // Generate new seeds that should have been dropped since last call
    while (this.lastSeedDistance + SEED_INTERVAL_METERS < distance) {
      this.lastSeedDistance += SEED_INTERVAL_METERS;
      const { lng, lat } = this.positionAtDistance(this.lastSeedDistance);
      const depth = 3 + Math.sin(this.lastSeedDistance / 200) * 4 + (Math.random() - 0.5) * 1;
      this.seeds.push({
        id: `seed-${this.seeds.length}`,
        lng: lng + (Math.random() - 0.5) * 0.0003,
        lat: lat + (Math.random() - 0.5) * 0.0003,
        depth: Math.round(depth * 10) / 10,
        timestamp: this.startTime + (this.lastSeedDistance / ROBOT_SPEED) * 1000,
      });
    }

    return {
      type: 'FeatureCollection',
      features: this.seeds.map((s) => ({
        type: 'Feature' as const,
        properties: { id: s.id, depth: s.depth, timestamp: s.timestamp, mission: this.missionId, missionName: 'Live Mission' },
        geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
      })),
    };
  }

  /** Completed path trail from start to current robot position */
  getPathTrail(): GeoJSON.Feature<GeoJSON.LineString> {
    const distance = this.getCurrentDistance();
    const coords: [number, number][] = [];
    for (let i = 0; i < this.pathLengths.length; i++) {
      if (this.pathLengths[i] <= distance) {
        coords.push(this.path[i]);
      } else {
        const { lng, lat } = this.positionAtDistance(distance);
        coords.push([lng, lat]);
        break;
      }
    }
    return {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coords },
    };
  }

  getStats(): LiveFeedStats {
    const distance = this.getCurrentDistance();
    const pos = this.getRobotPosition();
    const depths = this.seeds.map((s) => s.depth);
    return {
      totalSeeds: this.seeds.length,
      distanceCovered: Math.round(distance) / 1000,
      elapsedTime: Date.now() - this.startTime,
      currentSpeed: pos.properties!.speed as number,
      avgDepth: depths.length ? depths.reduce((a, b) => a + b, 0) / depths.length : 0,
      pathProgress: Math.min(distance / this.totalPathLength, 1),
    };
  }

  getRecentDrops(count = 10): LiveSeedDrop[] {
    return this.seeds.slice(-count).reverse();
  }
}
