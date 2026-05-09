"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Ship } from './types';
import MovingShip from './MovingShip';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapFollower({ ship }: { ship: Ship | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (ship) {
      // Pan to the ship smoothly without changing zoom if already zoomed in
      map.setView([ship.lat, ship.lng], map.getZoom() > 10 ? map.getZoom() : 13, { animate: true, duration: 1 });
    }
  }, [ship, map]);
  return null;
}

export default function BridgeMap({ ship }: { ship: Ship | undefined }) {
  if (!ship) return null;
  return (
    <MapContainer 
      center={[ship.lat, ship.lng]} 
      zoom={13} 
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MovingShip ship={ship} />
      <MapFollower ship={ship} />
    </MapContainer>
  );
}
