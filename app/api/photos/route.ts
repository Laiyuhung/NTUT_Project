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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { photoId, photoIds } = body

    // 支持單張照片刪除或批量刪除
    const idsToDelete = photoIds || (photoId ? [photoId] : [])

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: '未提供要刪除的照片 ID' }, { status: 400 })
    }

    console.log('準備刪除照片：', idsToDelete)

    // 1. 獲取照片的檔案路徑信息
    const { data: photos, error: queryError } = await supabase
      .from('photos')
      .select('id, file_url')
      .in('id', idsToDelete)

    if (queryError) {
      console.error('查詢照片資訊失敗：', queryError)
      return NextResponse.json({ 
        error: '查詢照片資訊失敗', 
        details: queryError.message 
      }, { status: 500 })
    }

    // 檢查找到的照片數量是否與請求的數量一致
    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: '找不到指定的照片' }, { status: 404 })
    }

    console.log('找到的照片資訊：', photos)

    // 收集 Storage 中需要刪除的檔案路徑
    const filesToDelete = photos.map(photo => {
      let filePath = photo.file_url || ''
      
      // 從 URL 中提取檔案路徑
      if (filePath.includes('storage/v1/object/public/')) {
        const match = filePath.match(/storage\/v1\/object\/public\/uploads\/(.+)/)
        if (match && match[1]) {
          return match[1]
        }
      }
      
      // 直接使用相對路徑
      if (!filePath.startsWith('http') && !filePath.startsWith('/')) {
        return `photos/${filePath}`
      }
      
      // 清理路徑：移除開頭的 / 如果存在
      if (filePath.startsWith('/')) {
        filePath = filePath.substring(1)
      }
      
      // 如果路徑不包含 photos/，則添加它
      if (!filePath.startsWith('photos/')) {
        filePath = `photos/${filePath}`
      }
      
      return filePath
    }).filter(Boolean) // 過濾空值
    
    console.log('需要從 Storage 刪除的檔案路徑：', filesToDelete)

    // 2. 從 Storage 刪除檔案
    if (filesToDelete.length > 0) {
      const { data: deleteStorageData, error: deleteStorageError } = await supabase
        .storage
        .from('uploads')
        .remove(filesToDelete)

      if (deleteStorageError) {
        console.error('從 Storage 刪除檔案失敗：', deleteStorageError)
        // 不中斷流程，繼續刪除數據庫記錄
      } else {
        console.log('Storage 檔案刪除結果：', deleteStorageData)
      }
    }

    // 3. 從數據庫刪除記錄
    const { error: deleteError } = await supabase
      .from('photos')
      .delete()
      .in('id', idsToDelete)

    if (deleteError) {
      console.error('刪除照片數據記錄失敗：', deleteError)
      return NextResponse.json({ 
        error: '刪除照片數據記錄失敗', 
        details: deleteError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `成功刪除 ${idsToDelete.length} 張照片`,
      deletedIds: idsToDelete
    })
  } catch (error) {
    console.error('刪除照片時發生錯誤：', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return NextResponse.json({ error: `刪除照片失敗: ${errorMessage}` }, { status: 500 })
  }
}
