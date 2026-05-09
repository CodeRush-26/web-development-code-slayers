"use client";

import React, { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Ship } from './types';
import { animate } from 'framer-motion';

// Custom divIcon to style it nicely with Tailwind
const createShipIcon = (isWarning: boolean, heading: number) => {
  const color = isWarning ? '#ef4444' : '#10b981'; // red-500 or emerald-500
  
  // Create an SVG ship icon pointing UP
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="24" height="24" style="transform: rotate(${heading}deg); transition: transform 0.3s ease; filter: drop-shadow(0px 0px 4px ${color});">
      <path d="M12 2L4 20l8-4 8 4-8-18z"/>
    </svg>
  `;
  
  return L.divIcon({
    html: `<div class="flex items-center justify-center w-8 h-8">${svg}</div>`,
    className: 'bg-transparent',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

export default function MovingShip({ ship }: { ship: Ship }) {
  const [position, setPosition] = useState<[number, number]>([ship.lat, ship.lng]);
  
  useEffect(() => {
    // When ship.lat or ship.lng changes, animate to the new position
    const controlsLat = animate(position[0], ship.lat, {
      duration: 0.9,
      ease: "linear",
      onUpdate: (v) => {
        setPosition(prev => [v, prev[1]]);
      }
    });
    
    const controlsLng = animate(position[1], ship.lng, {
      duration: 0.9,
      ease: "linear",
      onUpdate: (v) => {
        setPosition(prev => [prev[0], v]);
      }
    });

    return () => {
      controlsLat.stop();
      controlsLng.stop();
    };
  }, [ship.lat, ship.lng]);

  const isWarning = ship.status === 'out of fuel' || !!ship.weather_adverse;

  return (
    <Marker 
      position={position} 
      icon={createShipIcon(isWarning, ship.heading)}
    >
      <Popup>
        <div className="text-sm font-sans p-1">
          <strong className="block text-base mb-1">{ship.id.toUpperCase()}</strong>
          <div>Status: <span className={isWarning ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>{ship.status}</span></div>
          <div>Speed: {ship.speed.toFixed(1)} kts</div>
          <div>Heading: {ship.heading.toFixed(0)}°</div>
          <div>Fuel: {ship.fuel.toFixed(0)}</div>
        </div>
      </Popup>
    </Marker>
  );
}
