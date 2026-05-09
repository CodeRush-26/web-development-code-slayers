import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Server } from 'socket.io';

export interface Ship {
  id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  fuel: number;
  status: string;
  weather_adverse?: boolean;
}

export class Simulator {
  private fleet: Ship[] = [];
  private io: Server;
  private supabase: SupabaseClient | null = null;
  private tickCount: number = 0;
  private interval: NodeJS.Timeout | null = null;

  constructor(io: Server) {
    this.io = io;
    
    // Initialize Supabase if environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      console.warn('Supabase URL or Key is missing. Sync will be disabled.');
    }

    this.initFleet();
  }

  private initFleet() {
    for (let i = 0; i < 15; i++) {
      this.fleet.push({
        id: `ship-${i + 1}`,
        lat: 30 + (Math.random() * 10 - 5),
        lng: -90 + (Math.random() * 10 - 5),
        speed: 10 + Math.random() * 10,
        heading: Math.random() * 360,
        fuel: 1000 + Math.random() * 500,
        status: 'active',
        weather_adverse: Math.random() > 0.8
      });
    }
  }

  public start() {
    if (this.interval) {
      this.stop();
    }
    this.interval = setInterval(() => this.tick(), 1000);
    console.log('Simulator engine started');
  }

  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('Simulator engine stopped');
    }
  }

  private tick() {
    this.tickCount++;

    // Update fleet state
    this.fleet.forEach(ship => {
      // 4. Status Check: If fuel <= 0, set status to 'out of fuel' and speed to 0.
      if (ship.fuel <= 0) {
        ship.status = 'out of fuel';
        ship.speed = 0;
        ship.fuel = 0;
      } else {
        // 3. Movement Physics: Update lat/lng based on current speed and heading.
        // Assuming speed is abstract (e.g. knots) and we just want visible movement.
        const speedFactor = ship.speed * 0.0001; 
        const headingRad = ship.heading * (Math.PI / 180);
        
        // Formula: New Position = Old Position + (Vector from Speed/Heading * 1 second)
        ship.lat += speedFactor * Math.cos(headingRad);
        ship.lng += speedFactor * Math.sin(headingRad);

        // Fuel deduction based on speed
        let fuelBurn = ship.speed * 0.1;
        if (ship.weather_adverse) {
          fuelBurn *= 1.3; // increase fuel burn by 30%
        }
        
        ship.fuel -= fuelBurn;
        if (ship.fuel <= 0) {
          ship.fuel = 0;
          ship.status = 'out of fuel';
          ship.speed = 0;
        }
      }
    });

    // 5. Socket.io Integration: emit entire fleet state to 'fleet-update' room
    this.io.to('fleet-update').emit('fleet-state', this.fleet);

    // 6. Supabase Sync: Every 10 ticks, persist state to 'ships' table
    if (this.tickCount % 10 === 0) {
      this.syncToSupabase();
    }
  }

  private async syncToSupabase() {
    if (!this.supabase) return;
    
    try {
      // Upsert ships into the database
      const { error } = await this.supabase
        .from('ships')
        .upsert(this.fleet.map(ship => ({
          id: ship.id,
          lat: ship.lat,
          lng: ship.lng,
          speed: ship.speed,
          heading: ship.heading,
          fuel: ship.fuel,
          status: ship.status,
          updated_at: new Date().toISOString()
        })));
        
      if (error) {
        console.error('Error syncing to Supabase:', error.message);
      } else {
        console.log(`Synced ${this.fleet.length} ships to Supabase (Tick ${this.tickCount})`);
      }
    } catch (err) {
      console.error('Failed to sync to Supabase:', err);
    }
  }
}
