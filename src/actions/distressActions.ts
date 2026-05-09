'use server'

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function processDistressSignal(shipId: string, message: string) {
  if (!shipId || !message) return { error: 'Invalid payload' };

  try {
    // 1. Call OpenAI
    const prompt = `Extract the following from this maritime distress message: 
    1. Severity (Low/Medium/High)
    2. Category (Mechanical/Weather/Medical/Piracy)
    3. Estimated Impact. 
    
    Message: "${message}"`;

    let aiResult;
    
    if (process.env.OPENAI_API_KEY) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        // Enforce JSON structure through prompt
        functions: [{
          name: "format_distress_signal",
          parameters: {
            type: "object",
            properties: {
              Severity: { type: "string", enum: ["Low", "Medium", "High"] },
              Category: { type: "string", enum: ["Mechanical", "Weather", "Medical", "Piracy"] },
              Estimated_Impact: { type: "string" }
            },
            required: ["Severity", "Category", "Estimated_Impact"]
          }
        }],
        function_call: { name: "format_distress_signal" }
      });

      const args = response.choices[0].message.function_call?.arguments;
      aiResult = args ? JSON.parse(args) : null;
    } else {
      // Fallback if no API key is provided during testing
      aiResult = {
        Severity: "High",
        Category: "Mechanical",
        Estimated_Impact: "Complete loss of propulsion, drifting into active shipping lanes."
      };
    }

    if (!aiResult) {
      throw new Error("Failed to parse AI response");
    }

    // Include original message
    aiResult.Original_Message = message;

    // 2. Save to Supabase alerts table
    const { error: alertError } = await supabase
      .from('alerts')
      .insert([{ 
        ship_id: shipId, 
        message: JSON.stringify(aiResult) 
      }]);

    if (alertError) {
      console.error('Error saving alert:', alertError);
      return { error: alertError.message };
    }

    // 3. Update ships status to 'distressed'
    const { error: shipError } = await supabase
      .from('ships')
      .update({ status: 'distressed' })
      .eq('name', shipId); // Assuming shipId is the name (e.g. Vessel-1)

    if (shipError) {
      console.error('Error updating ship status:', shipError);
      // We don't fail the whole action if just status update fails
    }

    return { data: aiResult };
  } catch (error: any) {
    console.error('Distress processing error:', error);
    return { error: error.message };
  }
}
