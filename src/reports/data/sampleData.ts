import { Mission, PlantType, ReportData, SeedPoint } from '../types';

// ═══ Mission Definitions ═══
export const MISSIONS = [
  { id: 0, name: 'Mission Alpha',   date: 'Jan 12, 2026', color: '#34d399', seedCount: 218 },
  { id: 1, name: 'Mission Bravo',   date: 'Jan 26, 2026', color: '#38bdf8', seedCount: 244 },
  { id: 2, name: 'Mission Charlie', date: 'Feb 3, 2026',  color: '#fbbf24', seedCount: 206 },
  { id: 3, name: 'Mission Delta',   date: 'Feb 9, 2026',  color: '#c084fc', seedCount: 179 },
];

export const MISSION_COLORS = MISSIONS.map((m) => m.color);

// ═══ Map Config ═══
export const MAP_CENTER: [number, number] = [-5.1589, 51.7097]; // [lng, lat] — Dale, Wales

const DEG_TO_M = 111_320;

/**
 * Default rectangular boundary around MAP_CENTER for backward compatibility.
 * Matches the original path extent (~0.036 lng × 0.028 lat).
 */
const DEFAULT_BOUNDARY: [number, number][] = [
  [MAP_CENTER[0] - 0.018, MAP_CENTER[1] - 0.014],
  [MAP_CENTER[0] + 0.018, MAP_CENTER[1] - 0.014],
  [MAP_CENTER[0] + 0.018, MAP_CENTER[1] + 0.014],
  [MAP_CENTER[0] - 0.018, MAP_CENTER[1] + 0.014],
  [MAP_CENTER[0] - 0.018, MAP_CENTER[1] - 0.014],
];

// ═══ Lawnmower Path Generator ═══

/**
 * Generate a boustrophedon (lawnmower) path inside a rectangular sector boundary.
 * The path sweeps back and forth along the longer axis of the rectangle.
 */
export function generatePath(boundary: [number, number][] = DEFAULT_BOUNDARY): [number, number][] {
  // boundary = [p0, p1, p2, p3, p0] (closed ring, 4 corners)
  const p0 = boundary[0];
  const p1 = boundary[1];
  const p3 = boundary[3];

  // Two edge vectors from p0
  const edge01: [number, number] = [p1[0] - p0[0], p1[1] - p0[1]];
  const edge03: [number, number] = [p3[0] - p0[0], p3[1] - p0[1]];

  // Compute lengths in meters
  const cosLat = Math.cos((p0[1] * Math.PI) / 180);
  const len01 = Math.sqrt((edge01[0] * cosLat * DEG_TO_M) ** 2 + (edge01[1] * DEG_TO_M) ** 2);
  const len03 = Math.sqrt((edge03[0] * cosLat * DEG_TO_M) ** 2 + (edge03[1] * DEG_TO_M) ** 2);

  // Sweep along the longer edge, step along the shorter edge
  let sweepDir: [number, number], stepDir: [number, number];
  let sweepLen: number, stepLen: number;
  if (len01 >= len03) {
    sweepDir = edge01; sweepLen = len01;
    stepDir = edge03; stepLen = len03;
  } else {
    sweepDir = edge03; sweepLen = len03;
    stepDir = edge01; stepLen = len01;
  }

  // ~30m between parallel passes, ~10m between points
  const LINE_SPACING_M = 30;
  const POINT_SPACING_M = 10;
  const numPasses = Math.max(2, Math.round(stepLen / LINE_SPACING_M));
  const pointsPerPass = Math.max(4, Math.round(sweepLen / POINT_SPACING_M));

  // Inset slightly (5%) so the path doesn't sit exactly on the boundary edge
  const inset = 0.05;

  const coords: [number, number][] = [];
  for (let pass = 0; pass <= numPasses; pass++) {
    const tStep = inset + (pass / numPasses) * (1 - 2 * inset);
    const forward = pass % 2 === 0;

    for (let pt = 0; pt <= pointsPerPass; pt++) {
      const tSweep = forward
        ? inset + (pt / pointsPerPass) * (1 - 2 * inset)
        : inset + (1 - pt / pointsPerPass) * (1 - 2 * inset);

      coords.push([
        p0[0] + sweepDir[0] * tSweep + stepDir[0] * tStep,
        p0[1] + sweepDir[1] * tSweep + stepDir[1] * tStep,
      ]);
    }
  }

  return coords;
}

// ═══ Demo Seed Generator — Seeds/shoots planted along the path ═══
export function generateSeeds(
  path: [number, number][],
  totalCount?: number,
  missions: Mission[] = MISSIONS,
): SeedPoint[] {
  const seeds: SeedPoint[] = [];
  const baseCounts = missions.map((m) => m.seedCount);
  const baseTotal = baseCounts.reduce((a, b) => a + b, 0);

  // Scale per-mission counts to match the requested total
  const scale = totalCount != null && baseTotal > 0 ? totalCount / baseTotal : 1;
  const counts = baseCounts.map((c) => Math.round(c * scale));

  for (let m = 0; m < missions.length; m++) {
    const s0 = Math.floor((m / missions.length) * path.length);
    const s1 = Math.floor(((m + 1) / missions.length) * path.length);
    const seg = path.slice(s0, s1);
    for (let s = 0; s < counts[m]; s++) {
      // Distribute seeds evenly along the path segment
      const idx = Math.min(Math.floor((s / counts[m]) * seg.length), seg.length - 1);
      const base = seg[idx];
      seeds.push({
        // Tiny jitter (~3m) so dots don't stack exactly on the line
        lng: base[0] + (Math.random() - 0.5) * 0.00005,
        lat: base[1] + (Math.random() - 0.5) * 0.00005,
        mission: m,
        missionName: missions[m].name,
        depth: Math.round((1.5 + Math.random() * 22) * 10) / 10,
        date: missions[m].date,
      });
    }
  }
  return seeds;
}

// ═══ Demo Bathymetry Generator — Replace with real raster/tiles ═══
export function generateBathymetryGeoJSON(center: [number, number] = MAP_CENTER) {
  const features: GeoJSON.Feature[] = [];
  const cs = 0.003;
  for (let r = -12; r < 12; r++) {
    for (let c = -12; c < 12; c++) {
      const lng = center[0] + c * cs;
      const lat = center[1] + r * cs;
      const dist = Math.sqrt(Math.pow((c + 6) * 0.7, 2) + Math.pow((r - 4) * 1.1, 2));
      const depth = Math.max(0, 1.5 + dist * 1.8 + (Math.random() - 0.5) * 3);
      features.push({
        type: 'Feature',
        properties: { depth: Math.round(depth * 10) / 10 },
        geometry: {
          type: 'Polygon',
          coordinates: [[[lng, lat], [lng + cs, lat], [lng + cs, lat + cs], [lng, lat + cs], [lng, lat]]],
        },
      });
    }
  }
  return { type: 'FeatureCollection' as const, features };
}

// ═══ Convert seeds to GeoJSON ═══
export function seedsToGeoJSON(seeds: SeedPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: seeds.map((s) => ({
      type: 'Feature' as const,
      properties: {
        mission: s.mission,
        missionName: s.missionName,
        depth: s.depth,
        date: s.date,
      },
      geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
    })),
  };
}

export function pathToGeoJSON(coords: [number, number][]): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: coords },
  };
}

// ═══ Report Tab Data ═══
export function buildReportData(
  seeds: SeedPoint[],
  title = 'Seagrass Restoration',
  plantType: PlantType = 'seeds',
  missions: Mission[] = MISSIONS,
): ReportData {
  const unit = plantType;
  const unitSingular = plantType === 'seeds' ? 'seed' : 'shoot';
  const total = seeds.length;
  const depthBuckets = [0, 0, 0, 0];
  seeds.forEach((s) => {
    if (s.depth < 5) depthBuckets[0]++;
    else if (s.depth < 12) depthBuckets[1]++;
    else if (s.depth < 20) depthBuckets[2]++;
    else depthBuckets[3]++;
  });
  const depthPcts = depthBuckets.map((b) => Math.round((b / total) * 100));

  return {
    title,
    subtitle: `${missions.length} missions · ${total.toLocaleString()} ${unit} planted · Updated Feb 10, 2026`,
    missions,
    tabs: [
      {
        key: 'overview',
        label: 'Overview',
        sections: [
          {
            title: 'Planting Density',
            status: 'pass',
            description: `Average ${unitSingular} density across the restoration corridor vs. recommended minimums.`,
            hasMapLayer: true,
            metrics: [
              { label: 'Avg Density', value: 38, target: 30, unit: `${unit}/100m²` },
              { label: 'Min Density', value: 22, target: 20, unit: `${unit}/100m²` },
              { label: 'Coverage Uniformity', value: 72, target: 80, unit: '%' },
            ],
          },
          {
            title: 'Depth Distribution',
            status: 'warning',
            description: `${plantType === 'seeds' ? 'Seeds' : 'Shoots'} should span multiple depth ranges for resilient meadow establishment.`,
            hasMapLayer: true,
            metrics: [
              { label: 'Shallow (0–5m)', value: 85, target: 60, unit: '%' },
              { label: 'Mid (5–12m)', value: 62, target: 60, unit: '%' },
              { label: 'Deep (12–20m)', value: 28, target: 60, unit: '%' },
            ],
          },
          {
            title: 'Survivability Forecast',
            status: 'partial',
            description: 'Estimated 6-month survival rate based on depth, substrate, and water temperature.',
            metrics: [
              { label: 'Projected Survival', value: 64, target: 75, unit: '%' },
              { label: 'Substrate Match', value: 78, target: 80, unit: '%' },
            ],
          },
        ],
      },
      {
        key: 'coverage',
        label: 'Coverage',
        sections: [
          {
            title: 'Area Coverage',
            status: 'warning',
            description: 'Total area planted vs. the target restoration zone.',
            hasMapLayer: true,
            metrics: [
              { label: 'Area Planted', value: 1.8, target: 2.5, unit: 'km²' },
              { label: 'Corridor Width', value: 280, target: 400, unit: 'm' },
              { label: 'Gap-Free Stretch', value: 2.1, target: 3.0, unit: 'km' },
            ],
          },
          {
            title: 'Substrate Suitability',
            status: 'pass',
            description: 'Sandy and muddy substrates support seagrass root systems.',
            hasMapLayer: true,
            metrics: [
              { label: 'Sandy Substrate', value: 88, target: 80, unit: '%' },
              { label: 'Muddy Substrate', value: 8, target: 10, unit: '%' },
              { label: 'Rocky (avoid)', value: 4, target: 10, unit: '%', inverse: true },
            ],
          },
          {
            title: 'Proximity to Existing Meadows',
            status: 'pass',
            description: 'Nearby meadows improve genetic connectivity and natural reseeding.',
            metrics: [
              { label: 'Within 500m', value: 76, target: 60, unit: '%' },
              { label: 'Within 1km', value: 94, target: 80, unit: '%' },
            ],
          },
        ],
      },
      {
        key: 'bathymetry',
        label: 'Bathymetry',
        sections: [
          {
            title: 'Depth Profile',
            status: 'warning',
            description: 'Balanced depth distribution increases resilience against sea-level and temperature shifts.',
            hasMapLayer: true,
            metrics: [
              { label: '0 – 5m (Shallow)', value: depthPcts[0], target: 25, unit: '%' },
              { label: '5 – 12m (Optimal)', value: depthPcts[1], target: 35, unit: '%' },
              { label: '12 – 20m (Deep)', value: depthPcts[2], target: 25, unit: '%' },
              { label: '20m+ (Very Deep)', value: depthPcts[3], target: 15, unit: '%' },
            ],
          },
          {
            title: 'Slope & Gradient',
            status: 'pass',
            description: 'Gentle slopes retain sediment and support root establishment.',
            hasMapLayer: true,
            metrics: [
              { label: 'Gentle Slope (< 5°)', value: 82, target: 70, unit: '%' },
              { label: 'Moderate (5–15°)', value: 14, target: 20, unit: '%' },
              { label: 'Steep (> 15°)', value: 4, target: 10, unit: '%', inverse: true },
            ],
          },
          {
            title: 'Light Penetration',
            status: 'partial',
            description: 'Estimated PAR reaching the seabed at planting depth.',
            metrics: [
              { label: 'Adequate PAR', value: 68, target: 80, unit: '%' },
              { label: 'Marginal PAR', value: 24, target: 15, unit: '%', inverse: true },
              { label: 'Insufficient PAR', value: 8, target: 5, unit: '%', inverse: true },
            ],
          },
        ],
      },
      {
        key: 'missions',
        label: 'Missions',
        sections: [
          {
            title: 'Mission Density Comparison',
            status: 'pass',
            description: 'Planting density achieved per sortie.',
            metrics: [
              { label: 'Alpha – Density', value: 42, target: 30, unit: '/100m²' },
              { label: 'Bravo – Density', value: 36, target: 30, unit: '/100m²' },
              { label: 'Charlie – Density', value: 31, target: 30, unit: '/100m²' },
              { label: 'Delta – Density', value: 28, target: 30, unit: '/100m²' },
            ],
          },
          {
            title: 'Temporal Spacing',
            status: 'pass',
            description: 'Time between missions for assessment and recovery.',
            metrics: [
              { label: 'Alpha → Bravo', value: 14, target: 10, unit: 'days' },
              { label: 'Bravo → Charlie', value: 8, target: 10, unit: 'days' },
              { label: 'Charlie → Delta', value: 6, target: 10, unit: 'days' },
            ],
          },
          {
            title: 'Per-Mission Depth Avg',
            status: 'warning',
            description: 'Deeper missions improve network resilience.',
            metrics: [
              { label: 'Alpha Avg Depth', value: 6.2, target: 10, unit: 'm' },
              { label: 'Bravo Avg Depth', value: 8.1, target: 10, unit: 'm' },
              { label: 'Charlie Avg Depth', value: 5.8, target: 10, unit: 'm' },
              { label: 'Delta Avg Depth', value: 11.4, target: 10, unit: 'm' },
            ],
          },
        ],
      },
    ],
  };
}
