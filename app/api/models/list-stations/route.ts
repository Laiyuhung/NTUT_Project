import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 你可以將這裡的 supabaseUrl 和 supabaseKey 換成你的環境變數
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('station_code_map')
      .select('station_name, StationID')
      .not('StationID', 'is', null)
      .neq('StationID', '')
      .order('station_name', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
