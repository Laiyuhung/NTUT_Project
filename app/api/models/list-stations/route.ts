import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('station_code_map')
  .select('station_name, StationID, latitude, longitude')
      .not('StationID', 'is', null)
      .neq('StationID', '')
      .order('station_name', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
