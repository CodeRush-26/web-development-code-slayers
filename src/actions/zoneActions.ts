'use server'

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveRestrictedZone(name: string, coordinates: { lat: number, lng: number }[]) {
  if (!name || coordinates.length < 3) {
    return { error: 'Invalid zone data' };
  }

  const { data, error } = await supabase
    .from('restricted_zones')
    .insert([
      { name, coordinates }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error saving zone:', error);
    return { error: error.message };
  }

  return { data };
}
