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

// ═══ Study Sites ═══

export const STUDY_SITES: StudySite[] = [
  {
    id: 'coral-bay',
    name: 'Coral Bay',
    region: 'Fiji',
    center: [177.012, -17.7615],
    zoom: 13,
    sectors: [
      {
        id: 'coral-bay-north',
        name: 'North Corridor',
        center: [177.005, -17.755],
        boundary: [
          [176.996, -17.748], [177.014, -17.748],
          [177.014, -17.762], [176.996, -17.762],
          [176.996, -17.748],
        ],
        color: '#34d399',
      },
      {
        id: 'coral-bay-south',
        name: 'South Shelf',
        center: [177.019, -17.770],
        boundary: [
          [177.010, -17.763], [177.028, -17.763],
          [177.028, -17.777], [177.010, -17.777],
          [177.010, -17.763],
        ],
        color: '#38bdf8',
      },
    ],
  },
  {
    id: 'baa-atoll',
    name: 'Baa Atoll',
    region: 'Maldives',
    center: [72.98, 5.28],
    zoom: 13,
    sectors: [
      {
        id: 'baa-lagoon',
        name: 'Inner Lagoon',
        center: [72.975, 5.285],
        boundary: [
          [72.966, 5.292], [72.984, 5.292],
          [72.984, 5.278], [72.966, 5.278],
          [72.966, 5.292],
        ],
        color: '#34d399',
      },
      {
        id: 'baa-reef-edge',
        name: 'Reef Edge',
        center: [72.990, 5.275],
        boundary: [
          [72.981, 5.282], [72.999, 5.282],
          [72.999, 5.268], [72.981, 5.268],
          [72.981, 5.282],
        ],
        color: '#fbbf24',
      },
      {
        id: 'baa-channel',
        name: 'Channel Pass',
        center: [72.985, 5.290],
        boundary: [
          [72.976, 5.297], [72.994, 5.297],
          [72.994, 5.283], [72.976, 5.283],
          [72.976, 5.297],
        ],
        color: '#c084fc',
      },
    ],
  },
  {
    id: 'shark-bay',
    name: 'Shark Bay',
    region: 'Western Australia',
    center: [113.85, -25.80],
    zoom: 13,
    sectors: [
      {
        id: 'shark-wooramel',
        name: 'Wooramel Bank',
        center: [113.845, -25.795],
        boundary: [
          [113.836, -25.788], [113.854, -25.788],
          [113.854, -25.802], [113.836, -25.802],
          [113.836, -25.788],
        ],
        color: '#34d399',
      },
      {
        id: 'shark-faure',
        name: 'Faure Sill',
        center: [113.860, -25.805],
        boundary: [
          [113.851, -25.798], [113.869, -25.798],
          [113.869, -25.812], [113.851, -25.812],
          [113.851, -25.798],
        ],
        color: '#38bdf8',
      },
    ],
  },
];

// ═══ Generate all data for a single sector ═══

export function generateSectorData(sector: Sector, siteName: string): SectorData {
  const path = generatePath(sector.center);
  const seeds = generateSeeds(path);
  return {
    sectorId: sector.id,
    pathGeoJSON: pathToGeoJSON(path),
    seedsGeoJSON: seedsToGeoJSON(seeds),
    bathymetryGeoJSON: generateBathymetryGeoJSON(sector.center),
    reportData: buildReportData(seeds, `${siteName} — ${sector.name}`),
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
      subtitle: `${site.region} · ${site.sectors.length} sectors · ${totalSeeds.toLocaleString()} total seeds`,
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
