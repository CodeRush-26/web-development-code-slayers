"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import { Ship } from './types';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Compass, Fuel, AlertTriangle, CheckCircle, Radio } from 'lucide-react';
import { acknowledgeDirective } from '../../actions/directiveActions';
import { processDistressSignal } from '../../../app/actions/processDistress';

const BridgeMap = dynamic(() => import('./BridgeMap'), { ssr: false });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function CaptainDashboard({ shipId }: { shipId: string }) {
  const [ship, setShip] = useState<Ship | undefined>(undefined);
  const [directives, setDirectives] = useState<any[]>([]);
  const [isDistressModalOpen, setIsDistressModalOpen] = useState(false);
  const [distressMessage, setDistressMessage] = useState('');
  const [isSubmittingDistress, setIsSubmittingDistress] = useState(false);

  const fetchDirectives = async () => {
    const { data } = await supabase
      .from('directives')
      .select('*')
      .ilike('ship_id', shipId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setDirectives(data);
  };

  useEffect(() => {
    fetchDirectives();

    const channel = supabase.channel('captain-directives')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'directives' }, () => {
        fetchDirectives();
      })
      .subscribe();

    const socket: Socket = io('http://localhost:3001', {
      transports: ['websocket']
    });

    socket.on('fleet-state', (data: Ship[]) => {
      const myShip = data.find(s => s.name.toLowerCase() === shipId.toLowerCase() || s.id === shipId);
      if (myShip) setShip(myShip);
    });

    return () => {
      socket.disconnect();
      supabase.removeChannel(channel);
    };
  }, [shipId]);

  const handleAcknowledge = async (id: string) => {
    await acknowledgeDirective(id);
    setDirectives(prev => prev.filter(d => d.id !== id));
  };

  const handleSendDistress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distressMessage.trim()) return;
    
    setIsSubmittingDistress(true);
    const aiAnalysis = await processDistressSignal(distressMessage);
    
    // Now update Supabase with aiAnalysis.severity, etc.
    const { error: alertError } = await supabase
      .from('alerts')
      .insert([{ 
        ship_id: shipId, 
        message: JSON.stringify(aiAnalysis) 
      }]);

    if (alertError) {
      console.error('Error saving alert:', alertError);
      alert('Failed to transmit signal. Comm link error.');
    } else {
      // Update ships status to 'distressed'
      const { error: shipError } = await supabase
        .from('ships')
        .update({ status: 'distressed' })
        .eq('name', shipId);

      if (shipError) {
        console.error('Error updating ship status:', shipError);
      }

      setIsDistressModalOpen(false);
      setDistressMessage('');
      alert('Distress signal transmitted to Command HQ successfully.');
    }
    setIsSubmittingDistress(false);
  };

  return (
    <div className="relative w-full h-screen bg-[#0f0f11] overflow-hidden">
      <BridgeMap ship={ship} />
      
      {/* Telemetry HUD */}
      <div className="absolute top-6 left-6 z-10">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl text-white shadow-2xl w-80"
        >
          <div className="mb-6 pb-4 border-b border-white/10">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {shipId.toUpperCase()}
            </h1>
            <p className="text-sm text-gray-400 uppercase tracking-widest mt-1">Captain&apos;s Bridge</p>
          </div>

          {ship ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><Navigation size={24} /></div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Speed</p>
                  <p className="text-xl font-semibold font-mono">{ship.speed.toFixed(1)} <span className="text-sm text-gray-500">kts</span></p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400"><Compass size={24} /></div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Heading</p>
                  <p className="text-xl font-semibold font-mono">{ship.heading.toFixed(0)}&deg;</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400"><Fuel size={24} /></div>
                <div className="flex-1">
                  <div className="flex justify-between items-end">
                    <p className="text-xs text-gray-400 uppercase">Fuel</p>
                    <p className="text-lg font-semibold font-mono">{ship.fuel.toFixed(0)}</p>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div className="bg-amber-400 h-full transition-all duration-1000" style={{ width: `${Math.max(0, Math.min(100, (ship.fuel / 1000) * 100))}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-pulse text-gray-400 text-sm">Establishing link to vessel...</div>
          )}
        </motion.div>
      </div>

      {/* Directive Inbox */}
      <div className="absolute top-6 right-6 z-10 w-96 flex flex-col gap-4">
        <AnimatePresence>
          {directives.map(directive => (
            <motion.div
              key={directive.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="bg-black/60 backdrop-blur-xl border border-red-500/50 p-5 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.2)]"
            >
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                <div>
                  <h3 className="text-red-400 font-bold tracking-widest text-xs uppercase mb-1">Incoming Directive from HQ</h3>
                  <p className="text-white text-lg font-medium leading-tight">{directive.message}</p>
                </div>
              </div>
              <button
                onClick={() => handleAcknowledge(directive.id)}
                className="w-full py-2.5 mt-2 bg-red-500 hover:bg-red-600 text-white font-bold tracking-widest text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} /> Acknowledge Order
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Distress Signal Button */}
      <button 
        onClick={() => setIsDistressModalOpen(true)}
        className="absolute bottom-6 right-6 z-10 bg-red-600 hover:bg-red-500 text-white p-4 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-transform hover:scale-110 flex items-center justify-center animate-pulse"
        title="Send Distress Signal"
      >
        <Radio size={28} />
      </button>

      {/* Distress Signal Modal */}
      <AnimatePresence>
        {isDistressModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-900 border border-red-500/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.15)]"
            >
              <div className="bg-red-500/10 p-6 border-b border-red-500/20 flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-full text-red-500">
                  <AlertTriangle size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">TRANSMIT SOS</h2>
                  <p className="text-red-400 text-sm">Emergency Command Link</p>
                </div>
              </div>
              <form onSubmit={handleSendDistress} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">What is your emergency?</label>
                  <textarea 
                    value={distressMessage}
                    onChange={(e) => setDistressMessage(e.target.value)}
                    placeholder="e.g., Main engine failure, taking on water in aft compartment..."
                    className="w-full h-32 bg-black/50 border border-gray-700 rounded-xl p-4 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                    required
                  />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsDistressModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl font-medium text-gray-300 hover:bg-gray-800 transition-colors"
                    disabled={isSubmittingDistress}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingDistress || !distressMessage.trim()}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold tracking-widest uppercase disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isSubmittingDistress ? 'TRANSMITTING...' : 'SEND SIGNAL'} <Radio size={18} />
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

