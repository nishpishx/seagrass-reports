// ═══ Seagrass Reports — Type Definitions ═══

export interface Metric {
  label: string;
  value: number;
  target: number;
  unit: string;
  /** If true, lower values are better (e.g. "rocky substrate to avoid") */
  inverse?: boolean;
}

export type ReportStatus = 'pass' | 'warning' | 'partial' | 'fail';

export interface ReportSection {
  title: string;
  description: string;
  metrics: Metric[];
  status: ReportStatus;
  /** Show a "Map" toggle button on this card */
  hasMapLayer?: boolean;
  /** Mapbox layer IDs to toggle when "Map" is clicked */
  mapLayerIds?: string[];
}

export interface ReportTab {
  key: string;
  label: string;
  sections: ReportSection[];
}

export interface Mission {
  id: number;
  name: string;
  date: string;
  color: string;
  seedCount: number;
}

export interface SeedPoint {
  lng: number;
  lat: number;
  mission: number;
  missionName: string;
  depth: number;
  date: string;
}

export interface ReportData {
  title: string;
  subtitle: string;
  tabs: ReportTab[];
  missions: Mission[];
}

// ═══ Study Sites ═══

export type SectorStatus = 'planned' | 'active' | 'executed';

export interface Sector {
  id: string;
  name: string;
  center: [number, number];
  boundary: [number, number][];
  color: string;
  status: SectorStatus;
}

export type PlantType = 'seeds' | 'shoots';

export interface StudySite {
  id: string;
  name: string;
  region: string;
  center: [number, number];
  zoom: number;
  plantType: PlantType;
  sectors: Sector[];
}

export interface SectorData {
  sectorId: string;
  pathGeoJSON: GeoJSON.Feature;
  seedsGeoJSON: GeoJSON.FeatureCollection;
  bathymetryGeoJSON: GeoJSON.FeatureCollection;
  reportData: ReportData;
  totalSeeds: number;
  missionColors: string[];
}

// ═══ Live Feed Types ═══

export type ConnectionStatus = 'connecting' | 'connected' | 'degraded' | 'disconnected';

export interface LiveSeedDrop {
  id: string;
  lng: number;
  lat: number;
  depth: number;
  timestamp: number;
}

export interface LiveFeedStats {
  totalSeeds: number;
  distanceCovered: number;
  elapsedTime: number;
  currentSpeed: number;
  avgDepth: number;
  pathProgress: number;
}

export interface LiveFeedData {
  robotPosition: GeoJSON.Feature<GeoJSON.Point> | null;
  seedDrops: GeoJSON.FeatureCollection<GeoJSON.Point>;
  pathTrail: GeoJSON.Feature<GeoJSON.LineString>;
  stats: LiveFeedStats;
  connectionStatus: ConnectionStatus;
  recentDrops: LiveSeedDrop[];
}
