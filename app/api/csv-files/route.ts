import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const station = searchParams.get('station')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 從 Supabase 查詢 CSV 檔案資料
    let query = supabase
      .from('csv_uploads') // 假設資料表名稱為 csv_uploads
      .select('*')

    // 根據篩選條件添加查詢條件
    if (station) {
      query = query.eq('station_name', station)
    }

    if (startDate) {
      query = query.gte('upload_date', startDate)
    }

    if (endDate) {
      query = query.lte('upload_date', endDate)
    }

    // 按上傳時間倒序排列
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Supabase 查詢錯誤：', error)
      return NextResponse.json({ error: '查詢CSV檔案失敗' }, { status: 500 })
    }

    // 轉換資料格式以符合前端期望的格式
    const formattedData = data?.map(csv => ({
      id: csv.id.toString(),
      filename: csv.filename || 'unknown.csv',
      station_name: csv.station_name || '',
      upload_date: csv.upload_date || csv.created_at?.split('T')[0],
      uploaded_at: csv.created_at,
      record_count: csv.record_count || 0,
      file_size: csv.file_size || 0,
      file_url: csv.file_url || ''
    })) || []

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error('獲取CSV檔案清單失敗：', error)
    return NextResponse.json({ error: '獲取CSV檔案清單失敗' }, { status: 500 })
  }
}
