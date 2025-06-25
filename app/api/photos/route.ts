import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const station = searchParams.get('station')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 從 Supabase 查詢照片資料
    let query = supabase
      .from('photos') // 假設資料表名稱為 photos
      .select('*')

    // 根據篩選條件添加查詢條件
    if (station) {
      query = query.eq('nearest_station', station)
    }

    if (startDate) {
      query = query.gte('taken_at', startDate)
    }

    if (endDate) {
      query = query.lte('taken_at', endDate)
    }

    // 按拍攝時間倒序排列
    query = query.order('taken_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Supabase 查詢錯誤：', error)
      return NextResponse.json({ error: '查詢照片失敗' }, { status: 500 })
    }

    // 轉換資料格式以符合前端期望的格式
    const formattedData = data?.map(photo => ({
      id: photo.id.toString(),
      filename: photo.filename || 'unknown.jpg',
      taken_at: photo.taken_at,
      latitude: parseFloat(photo.latitude) || 0,
      longitude: parseFloat(photo.longitude) || 0,
      nearest_station: photo.nearest_station || '',
      uploaded_at: photo.created_at || photo.uploaded_at,
      file_size: photo.file_size || 0,
      file_url: photo.file_url || photo.image_url || ''
    })) || []

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error('獲取照片清單失敗：', error)
    return NextResponse.json({ error: '獲取照片清單失敗' }, { status: 500 })
  }
}
