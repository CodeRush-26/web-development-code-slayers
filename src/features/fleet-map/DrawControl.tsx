import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';

interface DrawControlProps {
  onPolygonDrawn: (coordinates: { lat: number; lng: number }[]) => void;
}

export default function DrawControl({ onPolygonDrawn }: DrawControlProps) {
  const map = useMap();
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);

  useEffect(() => {
    // Only initialize once to prevent disappearing in Strict Mode
    if (drawControlRef.current) return;

    drawnItemsRef.current = new L.FeatureGroup();
    map.addLayer(drawnItemsRef.current);

    drawControlRef.current = new L.Control.Draw({
      edit: {
        featureGroup: drawnItemsRef.current,
        remove: false,
        edit: false,
      },
      draw: {
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#e1e100',
            message: '<strong>Error:</strong> shape edges cannot cross!',
          },
          shapeOptions: {
            color: '#ef4444',
            weight: 3,
            fillColor: '#ef4444',
            fillOpacity: 0.2
          },
        },
        polyline: false,
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false,
      },
    });

    map.addControl(drawControlRef.current);

    const onDrawCreated = (e: any) => {
      const layer = e.layer;
      
      if (e.layerType === 'polygon') {
        const latlngs = layer.getLatLngs()[0];
        const coordinates = latlngs.map((ll: L.LatLng) => ({
          lat: ll.lat,
          lng: ll.lng,
        }));
        
        onPolygonDrawn(coordinates);
      }
    };

    map.on(L.Draw.Event.CREATED, onDrawCreated);

    return () => {
      // Do NOT remove control in cleanup during dev to avoid strict mode disappearance
      // Next.js fast refresh will handle it, or it will just persist on the map instance
    };
  }, [map, onPolygonDrawn]);

  return null;
}
