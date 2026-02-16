import type { StudySite, Sector, SectorData } from '../types';
import {
  MISSIONS,
  MISSION_COLORS,
  generatePath,
  generateSeeds,
  generateBathymetryGeoJSON,
  seedsToGeoJSON,
  pathToGeoJSON,
  buildReportData,
} from './sampleData';

// ═══ Per-sector target counts (seeds or shoots) ═══
const SECTOR_TARGETS: Record<string, number> = {
  'dale-west':    9_000,
  'dale-east':   26_000,
  'bali-reef':       80,
  'wa-north':       150,
  'wa-south':        30,
  'unc-alpha':    1_000,
  'unc-bravo':    1_000,
  'unc-charlie':    500,
};

// ═══ Study Sites ═══

export const STUDY_SITES: StudySite[] = [
  {
    id: 'dale',
    name: 'Project Seagrass',
    region: 'Dale, Wales',
    center: [-5.1589, 51.7097],
    zoom: 14,
    plantType: 'seeds',
    sectors: [
      {
        id: 'dale-west',
        name: 'West Plot',
        center: [-5.163, 51.713],
        boundary: [
          [-5.167, 51.711], [-5.159, 51.711],
          [-5.159, 51.715], [-5.167, 51.715],
          [-5.167, 51.711],
        ],
        color: '#34d399',
        status: 'executed',
      },
      {
        id: 'dale-east',
        name: 'East Plot',
        center: [-5.145, 51.7075],
        boundary: [
          [-5.152, 51.704], [-5.138, 51.704],
          [-5.138, 51.711], [-5.152, 51.711],
          [-5.152, 51.704],
        ],
        color: '#38bdf8',
        status: 'executed',
      },
    ],
  },
  {
    id: 'bali',
    name: 'LINI Shoot Planting',
    region: 'Bali, Indonesia',
    center: [115.2545, -8.7153],
    zoom: 17,
    plantType: 'shoots',
    sectors: [
      {
        id: 'bali-reef',
        name: 'Reef Flat',
        center: [115.2545, -8.7153],
        boundary: [
          [115.2535, -8.7161], [115.2555, -8.7161],
          [115.2555, -8.7145], [115.2535, -8.7145],
          [115.2535, -8.7161],
        ],
        color: '#34d399',
        status: 'executed',
      },
    ],
  },
  {
    id: 'wa-dnr',
    name: 'WA Dept. of Natural Resources',
    region: 'Washington State, USA',
    center: [-122.8237, 47.2294],
    zoom: 16,
    plantType: 'shoots',
    sectors: [
      {
        id: 'wa-north',
        name: 'North Bed',
        center: [-122.826, 47.231],
        boundary: [
          [-122.828, 47.2298], [-122.824, 47.2298],
          [-122.824, 47.2322], [-122.828, 47.2322],
          [-122.828, 47.2298],
        ],
        color: '#34d399',
        status: 'executed',
      },
      {
        id: 'wa-south',
        name: 'South Bed',
        center: [-122.822, 47.228],
        boundary: [
          [-122.8232, 47.2272], [-122.8208, 47.2272],
          [-122.8208, 47.2288], [-122.8232, 47.2288],
          [-122.8232, 47.2272],
        ],
        color: '#38bdf8',
        status: 'executed',
      },
    ],
  },
  {
    id: 'unc',
    name: 'University of North Carolina',
    region: 'North Carolina, USA',
    center: [-76.6144, 34.6844],
    zoom: 15,
    plantType: 'seeds',
    sectors: [
      {
        id: 'unc-alpha',
        name: 'Alpha Plot',
        center: [-76.620, 34.6865],
        boundary: [
          [-76.6225, 34.6845], [-76.6175, 34.6845],
          [-76.6175, 34.6885], [-76.6225, 34.6885],
          [-76.6225, 34.6845],
        ],
        color: '#34d399',
        status: 'executed',
      },
      {
        id: 'unc-bravo',
        name: 'Bravo Plot',
        center: [-76.610, 34.683],
        boundary: [
          [-76.6125, 34.681], [-76.6075, 34.681],
          [-76.6075, 34.685], [-76.6125, 34.685],
          [-76.6125, 34.681],
        ],
        color: '#38bdf8',
        status: 'executed',
      },
      {
        id: 'unc-charlie',
        name: 'Charlie Plot',
        center: [-76.615, 34.680],
        boundary: [
          [-76.617, 34.6785], [-76.613, 34.6785],
          [-76.613, 34.6815], [-76.617, 34.6815],
          [-76.617, 34.6785],
        ],
        color: '#c084fc',
        status: 'executed',
      },
    ],
  },
];

// ═══ Generate all data for a single sector ═══

export function generateSectorData(sector: Sector, site: StudySite): SectorData {
  const path = generatePath(sector.boundary);
  const targetCount = SECTOR_TARGETS[sector.id];

  // Scale mission seed counts to match this sector's target
  const baseTotal = MISSIONS.reduce((sum, m) => sum + m.seedCount, 0);
  const scale = targetCount != null && baseTotal > 0 ? targetCount / baseTotal : 1;
  const scaledMissions = MISSIONS.map((m) => ({
    ...m,
    seedCount: Math.round(m.seedCount * scale),
  }));

  const seeds = generateSeeds(path, targetCount, scaledMissions);
  return {
    sectorId: sector.id,
    pathGeoJSON: pathToGeoJSON(path),
    seedsGeoJSON: seedsToGeoJSON(seeds),
    bathymetryGeoJSON: generateBathymetryGeoJSON(sector.center),
    reportData: buildReportData(seeds, `${site.name} — ${sector.name}`, site.plantType, scaledMissions),
    totalSeeds: seeds.length,
    missionColors: MISSION_COLORS,
  };
}

// ═══ Site-level summary report (aggregated across sectors) ═══

export function buildSiteSummary(
  site: StudySite,
  sectorDataMap: Map<string, SectorData>,
): { totalSeeds: number; totalMissions: number; reportData: import('../types').ReportData } {
  let totalSeeds = 0;
  for (const sector of site.sectors) {
    const data = sectorDataMap.get(sector.id);
    if (data) totalSeeds += data.totalSeeds;
  }

  return {
    totalSeeds,
    totalMissions: MISSIONS.length,
    reportData: {
      title: `${site.name} — Site Overview`,
      subtitle: `${site.region} · ${site.sectors.length} sectors · ${totalSeeds.toLocaleString()} total ${site.plantType}`,
      missions: MISSIONS,
      tabs: [],
    },
  };
}

// ═══ Convert sector boundaries to GeoJSON for map display ═══

export function sectorsToGeoJSON(sectors: Sector[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: sectors.map((s) => ({
      type: 'Feature' as const,
      properties: { id: s.id, name: s.name, color: s.color },
      geometry: { type: 'Polygon' as const, coordinates: [s.boundary] },
    })),
  };
}
