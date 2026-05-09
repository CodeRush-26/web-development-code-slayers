'use server'

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function pushDirective(shipId: string, message: string) {
  if (!shipId || !message) return { error: 'Invalid payload' };

  const { data, error } = await supabase
    .from('directives')
    .insert([{ ship_id: shipId, message, status: 'pending' }])
    .select()
    .single();

  if (error) {
    console.error('Error pushing directive:', error);
    return { error: error.message };
  }

  return { data };
}

export async function acknowledgeDirective(directiveId: string) {
  if (!directiveId) return { error: 'Invalid directive ID' };

  const { data, error } = await supabase
    .from('directives')
    .update({ status: 'acknowledged' })
    .eq('id', directiveId)
    .select()
    .single();

  if (error) {
    console.error('Error acknowledging directive:', error);
    return { error: error.message };
  }

  return { data };
}
