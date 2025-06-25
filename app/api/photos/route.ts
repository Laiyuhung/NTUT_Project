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
      console.log('處理照片:', { id: photo.id, filename: photo.filename, file_url: photo.file_url })
      
      // 生成正確的檔案 URL
      let fileUrl = photo.file_url || photo.image_url || ''
      
      // 如果檔案 URL 是相對路徑，則生成完整的 Supabase Storage URL
      if (fileUrl && !fileUrl.startsWith('http')) {
        const bucket = 'uploads'
        // 清理路徑：移除開頭的 / 如果存在
        let cleanPath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl
        // 如果路徑不包含 photos/，則添加它
        if (!cleanPath.startsWith('photos/')) {
          cleanPath = `photos/${cleanPath}`
        }
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(cleanPath)
        fileUrl = urlData.publicUrl
        console.log('生成的 Storage URL:', fileUrl)
      }return {
        id: photo.id.toString(),
        filename: photo.filename || photo.file_url?.split('/').pop() || 'unknown.jpg',
        taken_at: photo.taken_at, // 直接使用，不進行時區轉換
        latitude: parseFloat(photo.latitude) || 0,
        longitude: parseFloat(photo.longitude) || 0,
        nearest_station: photo.nearest_station || '',
        uploaded_at: photo.created_at || photo.uploaded_at,
        file_size: 0, // 暫時設為 0，因為不顯示檔案大小
        file_url: fileUrl,
        // 加入預覽圖 URL (同樣的 URL，但前端可以用不同的參數)
        preview_url: fileUrl,
        // 加入檔案類型資訊
        file_type: photo.file_type || 'image/jpeg'
      }
    }) || []

    console.log('格式化後的資料樣本:', formattedData[0])

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error('獲取照片清單失敗：', error)
    return NextResponse.json({ error: '獲取照片清單失敗' }, { status: 500 })
  }
}
