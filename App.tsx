import React from 'react';
import { ReportsPage } from './reports';
import './reports/styles/tokens.css';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

export default function App() {
  if (!MAPBOX_TOKEN) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0b1420',
        color: '#93adc2',
        fontFamily: 'DM Sans, system-ui, sans-serif',
        textAlign: 'center',
        padding: 40,
      }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Missing Mapbox Token
          </p>
          <p style={{ fontSize: 13, color: '#546d82', lineHeight: 1.6 }}>
            Create a <code style={{
              background: '#162336',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 12,
            }}>.env</code> file in your project root with:
          </p>
          <pre style={{
            background: '#162336',
            padding: '12px 16px',
            borderRadius: 8,
            fontSize: 12,
            marginTop: 12,
            textAlign: 'left',
            display: 'inline-block',
          }}>VITE_MAPBOX_TOKEN=pk.eyJ1...</pre>
        </div>
      </div>
    );
  }

  return <ReportsPage mapboxToken={MAPBOX_TOKEN} />;
}
