import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const station = searchParams.get('station');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 分批抓取所有資料
    const pageSize = 1000;
    let from = 0;
    let to = pageSize - 1;
    let allData: any[] = [];
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('station_csv_uploads')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (station) {
        query = query.eq('station_name', station);
      }
      if (startDate) {
        query = query.gte('upload_date', startDate);
      }
      if (endDate) {
        query = query.lte('upload_date', endDate);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Supabase 查詢錯誤：', error);
        return NextResponse.json({ error: '查詢CSV檔案失敗' }, { status: 500 });
      }
      if (data && data.length > 0) {
        allData = allData.concat(data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
          to += pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    // 轉換資料格式以符合前端期望的格式
    const formattedData = allData.map(csv => ({
      id: csv.id.toString(),
      filename: csv.filename || `${csv.station_name}_${csv.upload_date || csv.created_at?.split('T')[0]}.csv`,
      station_name: csv.station_name || '',
      upload_date: csv.upload_date || csv.created_at?.split('T')[0],
      uploaded_at: csv.created_at,
      record_count: csv.record_count || 0,
      file_url: csv.file_url || ''
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('獲取CSV檔案清單失敗：', error);
    return NextResponse.json({ error: '獲取CSV檔案清單失敗' }, { status: 500 });
  }
}
