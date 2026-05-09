import Link from 'next/link';
import { Ship, RadioTower } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-6">
      <div className="max-w-4xl w-full text-center space-y-12">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-white to-gray-500 bg-clip-text text-transparent">
            Maritime Operations
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            Select your operational clearance level to access the secure network.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Command HQ Card */}
          <Link href="/command" className="group relative p-8 rounded-2xl bg-gray-900 border border-gray-800 hover:border-blue-500/50 transition-all hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center gap-4">
              <div className="p-4 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
                <RadioTower size={48} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-semibold">Command HQ</h2>
              <p className="text-sm text-gray-400 text-center">
                Global fleet overview, geofencing controls, and directive dispatching.
              </p>
            </div>
          </Link>

          {/* Captain Bridge Card */}
          <Link href="/bridge/Vessel-1" className="group relative p-8 rounded-2xl bg-gray-900 border border-gray-800 hover:border-emerald-500/50 transition-all hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center gap-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
                <Ship size={48} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-semibold">Captain's Bridge</h2>
              <p className="text-sm text-gray-400 text-center">
                Localized telemetry, navigation HUD, and secure communications.
              </p>
            </div>
          </Link>
        </div>
        
        <div className="text-sm text-gray-600">
          *Note: For MVP testing, clicking Captain defaults to Vessel-1.
        </div>
      </div>
    </div>
  );
}
