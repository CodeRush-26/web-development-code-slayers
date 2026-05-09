import React, { useState } from 'react';
import { saveRestrictedZone } from '../../actions/zoneActions';

interface SaveZoneModalProps {
  coordinates: { lat: number; lng: number }[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function SaveZoneModal({ coordinates, onClose, onSuccess }: SaveZoneModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a zone name');
      return;
    }

    setLoading(true);
    setError('');

    const result = await saveRestrictedZone(name, coordinates);
    
    setLoading(false);
    
    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-96 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-4">Save Restricted Zone</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-1">Zone Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Suez Chokepoint"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        <div className="text-sm text-gray-400 mb-6">
          <p>Coordinates: {coordinates.length} points captured</p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Zone'}
          </button>
        </div>
      </div>
    </div>
  );
}
