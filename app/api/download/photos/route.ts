import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { photoIds } = await request.json()

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: '請提供有效的照片ID陣列' }, { status: 400 })
    }

    // 在實際應用中，這裡應該從資料庫獲取照片資訊
    // 並從儲存系統（如 Supabase Storage）下載檔案
    
    // 模擬照片資料
    const mockPhotos = [
      { id: '1', filename: 'weather_photo_001.jpg', file_url: '/uploads/photos/weather_photo_001.jpg' },
      { id: '2', filename: 'weather_photo_002.jpg', file_url: '/uploads/photos/weather_photo_002.jpg' },
      { id: '3', filename: 'weather_photo_003.jpg', file_url: '/uploads/photos/weather_photo_003.jpg' }
    ]

    const selectedPhotos = mockPhotos.filter(photo => photoIds.includes(photo.id))

    if (selectedPhotos.length === 0) {
      return NextResponse.json({ error: '找不到指定的照片' }, { status: 404 })
    }

    // 如果只有一張照片，直接返回該照片
    if (selectedPhotos.length === 1) {
      const photo = selectedPhotos[0]
      // 在實際應用中，這裡應該從實際的儲存系統獲取檔案
      const fileContent = `模擬的照片內容：${photo.filename}`
      
      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Disposition': `attachment; filename="${photo.filename}"`
        }
      })
    }

    // 多張照片的情況，返回照片清單供前端處理
    // 在實際應用中，建議使用 ZIP 壓縮或提供個別下載連結
    return NextResponse.json({
      message: '批次下載功能需要ZIP支援，請安裝jszip套件',
      photos: selectedPhotos,
      suggestion: '建議逐一下載或使用ZIP壓縮功能'
    })

  } catch (error) {
    console.error('批次下載照片失敗：', error)
    return NextResponse.json({ error: '批次下載失敗' }, { status: 500 })
  }
}
