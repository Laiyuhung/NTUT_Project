import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const station = searchParams.get('station')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('查詢照片 - 篩選條件:', { station, startDate, endDate })

    // 從 Supabase 查詢照片資料
    let query = supabase
      .from('photos') // 確保資料表名稱正確
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
      return NextResponse.json({ 
        error: '查詢照片失敗', 
        details: error.message,
        hint: error.hint 
      }, { status: 500 })
    }

    console.log('查詢結果數量:', data?.length || 0)
    console.log('查詢結果樣本:', data?.[0])    // 轉換資料格式以符合前端期望的格式
    const formattedData = data?.map(photo => {
      // 生成正確的檔案 URL
      let fileUrl = photo.file_url || photo.image_url || ''
      
      // 如果檔案 URL 是相對路徑，則生成完整的 Supabase Storage URL
      if (fileUrl && !fileUrl.startsWith('http')) {
        const bucket = 'uploads' // 修正為您的 bucket 名稱
        // 假設檔案路徑是 photos/檔名
        const filePath = fileUrl.startsWith('photos/') ? fileUrl : `photos/${fileUrl}`
        fileUrl = supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl
      }

      return {
        id: photo.id.toString(),
        filename: photo.filename || 'unknown.jpg',
        taken_at: photo.taken_at,
        latitude: parseFloat(photo.latitude) || 0,
        longitude: parseFloat(photo.longitude) || 0,
        nearest_station: photo.nearest_station || '',
        uploaded_at: photo.created_at || photo.uploaded_at,
        file_size: photo.file_size || 0,
        file_url: fileUrl
      }
    }) || []

    console.log('格式化後的資料樣本:', formattedData[0])

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error('獲取照片清單失敗：', error)
    return NextResponse.json({ error: '獲取照片清單失敗' }, { status: 500 })
  }
}
