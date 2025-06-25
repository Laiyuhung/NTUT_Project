import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabaseClient'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const photoId = id

    // 從 Supabase 查詢照片資訊
    const { data: photo, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .single()

    if (error || !photo) {
      return NextResponse.json({ error: '找不到指定的照片' }, { status: 404 })
    }    // 從 Supabase Storage 獲取檔案
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('uploads') // 所有檔案都在 uploads bucket
      .download(photo.file_url)

    if (downloadError || !fileData) {
      console.error('下載照片失敗：', downloadError)
      return NextResponse.json({ error: '下載照片失敗' }, { status: 500 })
    }

    // 轉換為 ArrayBuffer 然後再轉為 Buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 從 file_url 中提取原始檔案名稱
    const originalFilename = photo.file_url?.split('/').pop() || 'photo.jpg'
    // 移除 UUID 前綴，保留原始檔案名稱
    const cleanFilename = originalFilename.includes('-') 
      ? originalFilename.substring(originalFilename.indexOf('-') + 1) 
      : originalFilename

    // 根據檔案類型設置正確的 Content-Type
    const contentType = photo.file_type || 'image/jpeg'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${cleanFilename}"`
      }
    })

  } catch (error) {
    console.error('下載照片失敗：', error)
    return NextResponse.json({ error: '下載照片失敗' }, { status: 500 })
  }
}
