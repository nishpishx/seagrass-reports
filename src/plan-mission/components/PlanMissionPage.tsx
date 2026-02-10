import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import PlanMissionSidebar from './PlanMissionSidebar';
import styles from './PlanMissionPage.module.css';

interface PlanMissionPageProps {
  mapboxToken: string;
  mapStyle?: string;
}

export default function PlanMissionPage({ mapboxToken, mapStyle }: PlanMissionPageProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle ?? 'mapbox://styles/mapbox/dark-v11',
      center: [0, 20],
      zoom: 2,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken, mapStyle]);

  return (
    <div className={styles.page}>
      <PlanMissionSidebar />
      <div className={styles.mapArea}>
        <div ref={mapContainer} className={styles.map} />
      </div>
    </div>
  );
}
