"use client";

import React from 'react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Ship } from './types';
import MovingShip from './MovingShip';
import DrawControl from './DrawControl';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface Zone {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number }[];
}

interface LiveFleetMapProps {
  ships: Ship[];
  zones: Zone[];
  onPolygonDrawn: (coordinates: { lat: number; lng: number }[]) => void;
}

export default function LiveFleetMap({ ships, zones, onPolygonDrawn }: LiveFleetMapProps) {
  // Center roughly in the Gulf of Mexico where ships start based on simulator.ts
  return (
    <MapContainer 
      center={[30, -90]} 
      zoom={6} 
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {zones.map(zone => (
        <Polygon 
          key={zone.id} 
          positions={zone.coordinates.map(c => [c.lat, c.lng])} 
          pathOptions={{ color: '#ef4444', weight: 3, fillColor: '#ef4444', fillOpacity: 0.2 }} 
        />
      ))}
      <DrawControl onPolygonDrawn={onPolygonDrawn} />
      {ships.map((ship) => (
        <MovingShip key={ship.id} ship={ship} />
      ))}
    </MapContainer>
  );
}
