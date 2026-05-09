"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import { Ship } from './types';
import { Toaster, toast } from 'sonner';
import SaveZoneModal from './SaveZoneModal';
import { createClient } from '@supabase/supabase-js';
import { Zone } from './LiveFleetMap';
import { pushDirective } from '../../actions/directiveActions';
import { Send, AlertCircle, CheckCircle2, Siren, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const LiveFleetMap = dynamic(() => import('./LiveFleetMap'), { ssr: false });

export default function FleetDashboard() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [drawingCoords, setDrawingCoords] = useState<{lat: number; lng: number}[] | null>(null);
  
  // Directive State
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);
  const [directiveMsg, setDirectiveMsg] = useState('');
  const [directives, setDirectives] = useState<any[]>([]);
  
  // Crisis State
  const [activeCrisis, setActiveCrisis] = useState<any | null>(null);

  const fetchZones = async () => {
    const { data } = await supabase.from('restricted_zones').select('*');
    if (data) setZones(data);
  };

  const fetchDirectives = async () => {
    const { data } = await supabase.from('directives').select('*').order('created_at', { ascending: false });
    if (data) setDirectives(data);
  };

  useEffect(() => {
    fetchZones();
    fetchDirectives();

    const channel = supabase.channel('directives-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'directives' }, () => {
        fetchDirectives();
      })
      .subscribe();

    const alertsChannel = supabase.channel('fleet-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        const alert = payload.new as any;
        try {
          const aiData = JSON.parse(alert.message);
          if (aiData.Severity === 'High') {
            setActiveCrisis({ shipId: alert.ship_id, ...aiData });
            try {
              new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(e => console.log('Audio blocked by browser', e));
            } catch (e) {}
          }
        } catch (e) {
          // Not a JSON message, ignore (e.g. standard geofence alert)
        }
      })
      .subscribe();
    const socket: Socket = io('http://localhost:3001', {
      transports: ['websocket']
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to socket server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from socket server');
    });

    socket.on('fleet-state', (data: Ship[]) => {
      setShips(data);
    });

    socket.on('GEOFENCE_BREACH', (data: { shipId: string; zoneName: string; lat: number; lng: number }) => {
      toast.error(`ALERT: ${data.shipId} breached restricted zone "${data.zoneName}"!`, {
        duration: 5000,
      });
    });

    return () => {
      socket.disconnect();
      supabase.removeChannel(channel);
      supabase.removeChannel(alertsChannel);
    };
  }, []);

  const handlePushDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipId || !directiveMsg.trim()) return;
    
    toast.promise(pushDirective(selectedShipId, directiveMsg), {
      loading: 'Pushing directive...',
      success: () => {
        setDirectiveMsg('');
        return `Directive sent to ${selectedShipId}`;
      },
      error: 'Failed to send directive'
    });
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-900 overflow-hidden text-gray-900 dark:text-gray-100">
      <Toaster richColors position="top-right" />
      
      {drawingCoords && (
        <SaveZoneModal 
          coordinates={drawingCoords} 
          onClose={() => setDrawingCoords(null)} 
          onSuccess={() => {
            setDrawingCoords(null);
            fetchZones(); // Refresh zones after saving
            toast.success('Zone saved successfully!');
          }} 
        />
      )}

      {/* Side Panel */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col z-10 shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold tracking-tight">Fleet Status</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {isConnected ? 'Connected to Simulator' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {ships.map((ship) => {
            const isWarning = ship.status === 'out of fuel' || ship.weather_adverse;
            
            // Check for pending directives
            const shipDirectives = directives.filter(d => d.ship_id === ship.name);
            const hasPending = shipDirectives.some(d => d.status === 'pending');

            return (
              <div 
                key={ship.id} 
                onClick={() => setSelectedShipId(ship.name)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedShipId === ship.name 
                    ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-900/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                    : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{ship.name.toUpperCase()}</span>
                    {hasPending ? (
                      <AlertCircle size={14} className="text-amber-500 animate-pulse" />
                    ) : shipDirectives.length > 0 ? (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    ) : null}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isWarning ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                    {ship.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <div>Fuel: {ship.fuel.toFixed(0)}</div>
                  <div>Speed: {ship.speed.toFixed(1)} kts</div>
                  <div className="col-span-2">Pos: {ship.lat.toFixed(4)}, {ship.lng.toFixed(4)}</div>
                </div>
              </div>
            );
          })}
          {ships.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 p-4 text-sm">
              Waiting for fleet data...
            </div>
          )}
        </div>

        {/* Directive Sender */}
        {selectedShipId && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
            <div className="text-xs font-semibold text-gray-500 mb-2">SEND DIRECTIVE TO {selectedShipId.toUpperCase()}</div>
            <form onSubmit={handlePushDirective} className="flex gap-2">
              <input 
                type="text" 
                value={directiveMsg}
                onChange={(e) => setDirectiveMsg(e.target.value)}
                placeholder="e.g. Halt immediately"
                className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <button 
                type="submit"
                disabled={!directiveMsg.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-3 py-2 transition-colors flex items-center justify-center"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-[#0f0f11]">
        <LiveFleetMap 
          ships={ships} 
          zones={zones} 
          onPolygonDrawn={(coords) => setDrawingCoords(coords)} 
        />
      </div>

      {/* Crisis Overlay */}
      <AnimatePresence>
        {activeCrisis && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
          >
            <div className="absolute inset-0 border-8 border-red-600/50 animate-pulse pointer-events-none" />
            
            <motion.div 
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-gray-900 border border-red-500 rounded-3xl w-full max-w-3xl overflow-hidden shadow-[0_0_100px_rgba(220,38,38,0.4)]"
            >
              <div className="bg-red-600 p-6 flex justify-between items-center text-white">
                <div className="flex items-center gap-4">
                  <Siren size={36} className="animate-pulse" />
                  <div>
                    <h2 className="text-3xl font-black tracking-widest">CRISIS ALERT</h2>
                    <p className="text-red-200 uppercase tracking-widest font-semibold text-sm">Priority Override</p>
                  </div>
                </div>
                <button onClick={() => setActiveCrisis(null)} className="hover:bg-red-700 p-2 rounded-lg transition-colors">
                  <X size={28} />
                </button>
              </div>
              
              <div className="p-8 space-y-8 text-white">
                <div className="flex items-center gap-6">
                  <div className="flex-1 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-400 text-xs uppercase tracking-widest mb-1">Vessel</p>
                    <p className="text-2xl font-bold">{activeCrisis.shipId}</p>
                  </div>
                  <div className="flex-1 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <p className="text-amber-400 text-xs uppercase tracking-widest mb-1">Category</p>
                    <p className="text-2xl font-bold">{activeCrisis.Category}</p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Estimated Impact (AI Analysis)</p>
                  <p className="text-xl font-medium text-red-100 bg-red-900/20 p-6 rounded-xl border border-red-500/20 leading-relaxed">
                    {activeCrisis.Estimated_Impact}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Original Transcript</p>
                  <p className="text-gray-300 italic font-serif border-l-2 border-gray-700 pl-4 py-2">
                    "{activeCrisis.Original_Message}"
                  </p>
                </div>
                
                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={() => {
                      setSelectedShipId(activeCrisis.shipId);
                      setDirectiveMsg('Help is on the way. Maintain current position.');
                      setActiveCrisis(null);
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest transition-all"
                  >
                    Draft Response
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
