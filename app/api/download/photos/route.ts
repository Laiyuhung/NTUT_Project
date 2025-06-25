import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { photoIds } = await request.json()

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: '請提供有效的照片ID陣列' }, { status: 400 })
    }

    // 從 Supabase 查詢照片資訊
    const { data: photos, error } = await supabase
      .from('photos')
      .select('*')
      .in('id', photoIds)

    if (error) {
      console.error('查詢照片失敗：', error)
      return NextResponse.json({ error: '查詢照片失敗' }, { status: 500 })
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: '找不到指定的照片' }, { status: 404 })
    }

    // 如果只有一張照片，直接返回該照片的下載連結
    if (photos.length === 1) {
      const photo = photos[0]
      
      // 從 Supabase Storage 獲取檔案
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('photos') // 假設 bucket 名稱為 photos
        .download(photo.file_path || photo.filename)

      if (downloadError) {
        console.error('下載照片失敗：', downloadError)
        return NextResponse.json({ error: '下載照片失敗' }, { status: 500 })
      }

      // 轉換為 ArrayBuffer 然後再轉為 Buffer
      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Disposition': `attachment; filename="${photo.filename}"`
        }
      })
    }

    // 多張照片的情況，返回照片清單供前端處理
    // 建議使用 ZIP 壓縮或提供個別下載連結
    const photoList = photos.map(photo => ({
      id: photo.id,
      filename: photo.filename,
      downloadUrl: `/api/download/photo/${photo.id}` // 個別下載連結
    }))

    return NextResponse.json({
      message: '多張照片建議個別下載',
      photos: photoList,
      suggestion: '請逐一下載或使用ZIP壓縮功能'
    })

  } catch (error) {
    console.error('批次下載照片失敗：', error)
    return NextResponse.json({ error: '批次下載失敗' }, { status: 500 })
  }
}
