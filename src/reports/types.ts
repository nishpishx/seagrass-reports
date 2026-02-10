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
