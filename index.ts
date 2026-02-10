// ═══ Seagrass Reports — Public API ═══

// Main page component (sidebar + map)
export { default as ReportsPage } from './components/ReportsPage';

// Individual components for custom layouts
export { default as ReportSidebar } from './components/ReportSidebar';
export { default as ReportCard } from './components/ReportCard';
export { default as MetricBar } from './components/MetricBar';
export { default as MissionLegend } from './components/MissionLegend';
export { default as StatGrid } from './components/StatGrid';
export { default as SummaryCard } from './components/SummaryCard';
export { default as MapOverlay, DEFAULT_LAYERS } from './components/MapOverlay';

// Map hook for custom map integrations
export { default as useReportMap } from './hooks/useReportMap';

// Types
export type {
  Metric,
  ReportStatus,
  ReportSection,
  ReportTab,
  Mission,
  SeedPoint,
  ReportData,
} from './types';

// Data helpers (swap these for your real data sources)
export {
  MISSIONS,
  MISSION_COLORS,
  MAP_CENTER,
  generatePath,
  generateSeeds,
  generateBathymetryGeoJSON,
  seedsToGeoJSON,
  pathToGeoJSON,
  buildReportData,
} from './data/sampleData';
